// ============================================
// validation.js - Complete Form Validation Module - BoostBangla Design System v3.0
// Handles all form validation with real-time feedback and Design System styles
// Version: 3.0 - DESIGN SYSTEM COMPLIANT
// ============================================

// ============================================
// INJECT VALIDATION STYLES
// ============================================
function injectValidationStyles() {
    const styleId = 'boostbangla-validation-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        /* Validation Input States - Design System */
        .input-valid {
            border-color: #10b981 !important;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 16px;
            padding-right: 36px;
        }
        
        .input-invalid {
            border-color: #ef4444 !important;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='12' y1='8' x2='12' y2='12'%3E%3C/line%3E%3Cline x1='12' y1='16' x2='12.01' y2='16'%3E%3C/line%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 16px;
            padding-right: 36px;
        }
        
        /* Error Message */
        .validation-error {
            color: #ef4444;
            font-size: 12px;
            margin-top: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
            animation: slideDown 0.2s ease;
        }
        
        .validation-error i {
            font-size: 12px;
        }
        
        /* Success Message */
        .validation-success {
            color: #10b981;
            font-size: 12px;
            margin-top: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        /* Password Strength Meter - Design System */
        .password-strength-meter {
            margin-top: 10px;
        }
        
        .strength-bar-container {
            display: flex;
            gap: 6px;
            margin-bottom: 8px;
        }
        
        .strength-bar {
            flex: 1;
            height: 6px;
            background: #e5e7eb;
            border-radius: 6px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        body.dark-mode .strength-bar {
            background: #334155;
        }
        
        .strength-text {
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 4px;
        }
        
        .strength-suggestions {
            font-size: 11px;
            color: #6b7280;
            margin-top: 4px;
        }
        
        body.dark-mode .strength-suggestions {
            color: #94a3b8;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Call style injection
injectValidationStyles();

// ============================================
// EMAIL VALIDATION
// ============================================

function isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return emailRegex.test(email);
}

function validateEmail(email) {
    if (!email) {
        return { isValid: false, message: 'Email is required' };
    }
    if (!isValidEmail(email)) {
        return { isValid: false, message: 'Please enter a valid email address (e.g., name@example.com)' };
    }
    return { isValid: true, message: 'Valid email' };
}

// ============================================
// PHONE VALIDATION (Bangladesh)
// ============================================

function isValidBangladeshPhone(phone) {
    if (!phone) return false;
    const phoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
    return phoneRegex.test(phone);
}

function validatePhone(phone) {
    if (!phone) {
        return { isValid: false, message: 'Phone number is required' };
    }
    if (!isValidBangladeshPhone(phone)) {
        return { isValid: false, message: 'Please enter a valid Bangladesh phone number (e.g., 017XXXXXXXX or +8801XXXXXXXXX)' };
    }
    return { isValid: true, message: 'Valid phone number' };
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('01')) {
        return cleaned;
    }
    if (cleaned.length === 13 && cleaned.startsWith('8801')) {
        return '0' + cleaned.slice(3);
    }
    return phone;
}

// ============================================
// USERNAME VALIDATION
// ============================================

function validateUsername(username) {
    if (!username) {
        return { isValid: false, message: 'Username is required' };
    }
    if (username.length < 3) {
        return { isValid: false, message: 'Username must be at least 3 characters' };
    }
    if (username.length > 30) {
        return { isValid: false, message: 'Username must be less than 30 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }
    return { isValid: true, message: 'Valid username' };
}

// ============================================
// PASSWORD VALIDATION
// ============================================

function checkPasswordStrength(password) {
    if (!password) {
        return { score: 0, strength: 'Very Weak', color: '#ef4444', suggestions: ['Enter a password'], isValid: false };
    }
    
    let score = 0;
    const suggestions = [];
    
    if (password.length >= 8) {
        score++;
    } else {
        suggestions.push('Use at least 8 characters');
    }
    
    if (password.length >= 12) score++;
    
    if (/[a-z]/.test(password)) {
        score++;
    } else {
        suggestions.push('Add lowercase letters');
    }
    
    if (/[A-Z]/.test(password)) {
        score++;
    } else {
        suggestions.push('Add uppercase letters');
    }
    
    if (/[0-9]/.test(password)) {
        score++;
    } else {
        suggestions.push('Add numbers');
    }
    
    if (/[^a-zA-Z0-9]/.test(password)) {
        score++;
    } else {
        suggestions.push('Add special characters (!@#$% etc.)');
    }
    
    let strength = 'Very Weak';
    let color = '#ef4444';
    
    if (score >= 6) {
        strength = 'Excellent';
        color = '#10b981';
    } else if (score >= 5) {
        strength = 'Strong';
        color = '#059669';
    } else if (score >= 4) {
        strength = 'Good';
        color = '#3b82f6';
    } else if (score >= 3) {
        strength = 'Fair';
        color = '#f59e0b';
    } else if (score >= 2) {
        strength = 'Weak';
        color = '#d97706';
    }
    
    return {
        score: Math.min(score, 6),
        strength: strength,
        color: color,
        suggestions: suggestions,
        isValid: score >= 4
    };
}

function validatePasswordMatch(password, confirmPassword) {
    if (!confirmPassword) {
        return { isValid: false, message: 'Please confirm your password' };
    }
    if (password !== confirmPassword) {
        return { isValid: false, message: 'Passwords do not match' };
    }
    return { isValid: true, message: 'Passwords match' };
}

// ============================================
// URL VALIDATION
// ============================================

function isValidUrl(url) {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

function validateSocialMediaUrl(url, platform = null) {
    if (!url) {
        return { isValid: false, message: 'URL is required' };
    }
    
    if (!isValidUrl(url)) {
        return { isValid: false, message: 'Please enter a valid URL starting with http:// or https://' };
    }
    
    if (platform) {
        const platformPatterns = {
            youtube: /(youtube\.com|youtu\.be)/,
            facebook: /(facebook\.com|fb\.com)/,
            instagram: /instagram\.com/,
            tiktok: /tiktok\.com/,
            twitter: /(twitter\.com|x\.com)/,
            telegram: /t\.me|telegram\.org/
        };
        
        const pattern = platformPatterns[platform.toLowerCase()];
        if (pattern && !pattern.test(url)) {
            return { isValid: false, message: `Please enter a valid ${platform.charAt(0).toUpperCase() + platform.slice(1)} URL` };
        }
    }
    
    return { isValid: true, message: 'Valid URL' };
}

// ============================================
// QUANTITY & AMOUNT VALIDATION
// ============================================

function validateQuantity(quantity, min = 1, max = 100000) {
    const qty = parseInt(quantity);
    
    if (isNaN(qty)) {
        return { isValid: false, message: 'Please enter a valid number' };
    }
    
    if (qty < min) {
        return { isValid: false, message: `Minimum quantity is ${min.toLocaleString()}` };
    }
    
    if (qty > max) {
        return { isValid: false, message: `Maximum quantity is ${max.toLocaleString()}` };
    }
    
    return { isValid: true, message: 'Valid quantity' };
}

function validateAmount(amount, min = 5, max = 10000) {
    const amt = parseFloat(amount);
    
    if (isNaN(amt)) {
        return { isValid: false, message: 'Please enter a valid amount' };
    }
    
    if (amt < min) {
        return { isValid: false, message: `Minimum amount is $${min}` };
    }
    
    if (amt > max) {
        return { isValid: false, message: `Maximum amount is $${max.toLocaleString()}` };
    }
    
    return { isValid: true, message: 'Valid amount' };
}

// ============================================
// GENERAL VALIDATION
// ============================================

function validateRequired(value, fieldName = 'This field') {
    if (!value || value.toString().trim() === '') {
        return { isValid: false, message: `${fieldName} is required` };
    }
    return { isValid: true, message: '' };
}

function validateLength(value, min, max, fieldName = 'This field') {
    if (!value) {
        return { isValid: false, message: `${fieldName} is required` };
    }
    
    const length = value.toString().length;
    
    if (length < min) {
        return { isValid: false, message: `${fieldName} must be at least ${min} characters` };
    }
    
    if (length > max) {
        return { isValid: false, message: `${fieldName} must be less than ${max} characters` };
    }
    
    return { isValid: true, message: '' };
}

function validateNumeric(value, fieldName = 'This field') {
    const num = parseFloat(value);
    if (isNaN(num)) {
        return { isValid: false, message: `${fieldName} must be a number` };
    }
    return { isValid: true, message: '', value: num };
}

function validateSelect(value, fieldName = 'This field') {
    if (!value || value === '' || value === 'none') {
        return { isValid: false, message: `Please select ${fieldName.toLowerCase()}` };
    }
    return { isValid: true, message: '' };
}

// ============================================
// REAL-TIME VALIDATION BINDING
// ============================================

function bindRealTimeValidation(input, validator, errorElement) {
    if (!input) return () => true;
    
    const validate = () => {
        const result = validator(input.value);
        if (errorElement) {
            errorElement.innerHTML = '';
            if (!result.isValid) {
                errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${result.message}`;
                errorElement.className = 'validation-error';
                input.classList.remove('input-valid');
                input.classList.add('input-invalid');
            } else if (result.message && result.message !== '') {
                errorElement.innerHTML = `<i class="fas fa-check-circle"></i> ${result.message}`;
                errorElement.className = 'validation-success';
                input.classList.remove('input-invalid');
                input.classList.add('input-valid');
            } else {
                errorElement.innerHTML = '';
                input.classList.remove('input-invalid', 'input-valid');
            }
        }
        return result.isValid;
    };
    
    input.addEventListener('input', validate);
    input.addEventListener('blur', validate);
    input.addEventListener('change', validate);
    
    // Initial validation
    validate();
    
    return validate;
}

function createPasswordStrengthMeter(passwordInput, container) {
    if (!passwordInput || !container) return;
    
    const meterHtml = `
        <div class="password-strength-meter">
            <div class="strength-bar-container">
                <div class="strength-bar" data-index="0"></div>
                <div class="strength-bar" data-index="1"></div>
                <div class="strength-bar" data-index="2"></div>
                <div class="strength-bar" data-index="3"></div>
                <div class="strength-bar" data-index="4"></div>
                <div class="strength-bar" data-index="5"></div>
            </div>
            <div class="strength-text"></div>
            <div class="strength-suggestions"></div>
        </div>
    `;
    
    container.innerHTML = meterHtml;
    
    const bars = container.querySelectorAll('.strength-bar');
    const textEl = container.querySelector('.strength-text');
    const suggestionsEl = container.querySelector('.strength-suggestions');
    
    const updateMeter = () => {
        const strength = checkPasswordStrength(passwordInput.value);
        
        bars.forEach((bar, index) => {
            if (index < strength.score) {
                bar.style.background = strength.color;
            } else {
                bar.style.background = '';
            }
        });
        
        textEl.textContent = `Strength: ${strength.strength}`;
        textEl.style.color = strength.color;
        
        if (strength.suggestions.length > 0 && strength.score < 4) {
            suggestionsEl.innerHTML = `💡 ${strength.suggestions.slice(0, 2).join(' • ')}`;
        } else if (strength.score >= 5) {
            suggestionsEl.innerHTML = '✓ Excellent! Your password is very secure.';
            suggestionsEl.style.color = '#10b981';
        } else if (strength.score >= 4) {
            suggestionsEl.innerHTML = '✓ Good password!';
            suggestionsEl.style.color = '#3b82f6';
        } else {
            suggestionsEl.innerHTML = '';
        }
    };
    
    passwordInput.addEventListener('input', updateMeter);
    passwordInput.addEventListener('focus', updateMeter);
    updateMeter();
    
    return updateMeter;
}

// ============================================
// FORM VALIDATION HELPER
// ============================================

function validateForm(formElement, validationRules) {
    const errors = {};
    let isValid = true;
    
    for (const [fieldName, validator] of Object.entries(validationRules)) {
        const field = formElement.querySelector(`[name="${fieldName}"]`);
        if (field) {
            const result = validator(field.value);
            if (!result.isValid) {
                errors[fieldName] = result.message;
                isValid = false;
                
                // Highlight field
                field.classList.add('input-invalid');
                field.classList.remove('input-valid');
            } else {
                field.classList.remove('input-invalid');
                if (result.message && result.message !== '') {
                    field.classList.add('input-valid');
                }
            }
        }
    }
    
    return { isValid, errors };
}

// ============================================
// EXPORT FUNCTIONS
// ============================================
window.isValidEmail = isValidEmail;
window.validateEmail = validateEmail;
window.isValidBangladeshPhone = isValidBangladeshPhone;
window.validatePhone = validatePhone;
window.formatPhoneNumber = formatPhoneNumber;
window.validateUsername = validateUsername;
window.checkPasswordStrength = checkPasswordStrength;
window.validatePasswordMatch = validatePasswordMatch;
window.isValidUrl = isValidUrl;
window.validateSocialMediaUrl = validateSocialMediaUrl;
window.validateQuantity = validateQuantity;
window.validateAmount = validateAmount;
window.validateRequired = validateRequired;
window.validateLength = validateLength;
window.validateNumeric = validateNumeric;
window.validateSelect = validateSelect;
window.bindRealTimeValidation = bindRealTimeValidation;
window.createPasswordStrengthMeter = createPasswordStrengthMeter;
window.validateForm = validateForm;

console.log('✅ Validation module v3.0 loaded - Design System compliant');