const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const mysql = require('mysql2/promise');

admin.initializeApp();
const firestore = admin.firestore();

function requireAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in is required.');
  const token = request.auth.token || {};
  if (token.admin === true || ['admin', 'support'].includes(String(token.role || '').toLowerCase())) return;
  throw new HttpsError('permission-denied', 'Administrator access is required.');
}

function cleanReference(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
}

async function mysqlWalletCredit({ userId, amount, note, referenceId }) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'boostbangla'
  });

  try {
    await connection.beginTransaction();
    await connection.execute('INSERT IGNORE INTO user_wallets (user_id, balance) VALUES (?, 0)', [String(userId)]);
    const [walletRows] = await connection.execute('SELECT balance FROM user_wallets WHERE user_id = ? FOR UPDATE', [String(userId)]);
    if (!walletRows.length) throw new Error('Wallet was not created.');

    const [existingRows] = await connection.execute(
      'SELECT balance_before, balance_after FROM order_transactions WHERE reference_id = ? LIMIT 1',
      [referenceId]
    );
    if (existingRows.length) {
      await connection.commit();
      return {
        idempotent: true,
        previousBalance: Number(existingRows[0].balance_before || 0),
        newBalance: Number(existingRows[0].balance_after || 0)
      };
    }

    const previousBalance = Number(walletRows[0].balance || 0);
    const newBalance = Number((previousBalance + amount).toFixed(4));
    await connection.execute('UPDATE user_wallets SET balance = ? WHERE user_id = ?', [newBalance, String(userId)]);
    await connection.execute(
      'INSERT INTO order_transactions (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [String(userId), 'credit', amount, previousBalance, newBalance, String(note || 'Admin added funds').slice(0, 500), referenceId]
    );
    await connection.commit();
    return { idempotent: false, previousBalance, newBalance };
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    await connection.end().catch(() => {});
  }
}

async function syncFirestoreWallet({ userId, amount, note, referenceId, adminId, previousBalance, newBalance, idempotent }) {
  const transactionRef = firestore.collection('adminTransactions').doc(referenceId);
  const userRef = firestore.collection('users').doc(String(userId));

  await firestore.runTransaction(async (transaction) => {
    const transactionDoc = await transaction.get(transactionRef);
    if (transactionDoc.exists && transactionDoc.data()?.mysqlSyncStatus === 'synced') return;

    transaction.set(userRef, {
      balance: newBalance,
      balanceUSD: Number((newBalance / 120).toFixed(2)),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(transactionRef, {
      userId: String(userId),
      type: 'admin_add',
      amount,
      previousBalance,
      newBalance,
      note: String(note || 'Admin added funds').slice(0, 500),
      adminId,
      idempotent: Boolean(idempotent),
      mysqlSyncStatus: 'synced',
      firestoreSyncStatus: 'synced',
      createdAt: transactionDoc.exists ? transactionDoc.data()?.createdAt || admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

exports.adminAdjustWallet = onCall({ region: 'asia-south1', timeoutSeconds: 60, memory: '256MiB' }, async (request) => {
  requireAdmin(request);
  const { userId, amount, note = '', requestId } = request.data || {};
  const value = Number(amount);
  const referenceId = cleanReference(requestId);

  if (!userId || !Number.isFinite(value) || value <= 0 || value > 1000000 || !referenceId) {
    throw new HttpsError('invalid-argument', 'A valid user, amount and request identifier are required.');
  }

  let wallet;
  try {
    wallet = await mysqlWalletCredit({ userId, amount: value, note, referenceId });
  } catch (error) {
    console.error('MySQL wallet credit failed', error);
    throw new HttpsError('internal', 'Wallet adjustment was not completed in the order database.');
  }

  try {
    await syncFirestoreWallet({
      userId,
      amount: value,
      note,
      referenceId,
      adminId: request.auth.uid,
      previousBalance: wallet.previousBalance,
      newBalance: wallet.newBalance,
      idempotent: wallet.idempotent
    });
    return {
      success: true,
      requestId: referenceId,
      previousBalance: wallet.previousBalance,
      newBalance: wallet.newBalance,
      mysqlSyncStatus: 'synced',
      firestoreSyncStatus: 'synced',
      idempotent: wallet.idempotent
    };
  } catch (error) {
    console.error('Firestore wallet mirror failed after MySQL success', error);
    return {
      success: true,
      requestId: referenceId,
      previousBalance: wallet.previousBalance,
      newBalance: wallet.newBalance,
      mysqlSyncStatus: 'synced',
      firestoreSyncStatus: 'failed',
      warning: 'Wallet was credited in the order database. Dashboard mirror needs reconciliation before showing the new balance.',
      idempotent: wallet.idempotent
    };
  }
});
