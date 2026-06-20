<?php
/**
 * BoostBangla Provider Client
 * Single server-only AmarBoost transport used by cron/diagnostic endpoints.
 * Provider keys never leave PHP.
 */
if (!class_exists('BoostBanglaProviderClient')) {
    class BoostBanglaProviderClient {
        private $url;
        private $key;

        public function __construct($url = null, $key = null) {
            $this->url = $url ?: (defined('AMARBOOST_API_URL') ? AMARBOOST_API_URL : (getenv('AMARBOOST_API_URL') ?: ''));
            $this->key = $key ?: (defined('AMARBOOST_API_KEY') ? AMARBOOST_API_KEY : (getenv('AMARBOOST_API_KEY') ?: ''));
        }

        public function configured() {
            return $this->url !== '' && $this->key !== '';
        }

        public function endpoint() {
            return $this->url;
        }

        public function services() {
            return $this->call(['action' => 'services']);
        }

        public function status($providerOrderId) {
            if (!ctype_digit((string)$providerOrderId)) {
                return ['ok' => false, 'status' => 0, 'data' => null, 'error' => 'Invalid provider order identifier.', 'network_error' => false];
            }
            return $this->call(['action' => 'status', 'order' => (int)$providerOrderId]);
        }

        public function call($payload) {
            if (!$this->configured()) {
                return ['ok' => false, 'status' => 0, 'data' => null, 'error' => 'Provider is not configured.', 'network_error' => false];
            }

            $payload['key'] = $this->key;
            $body = http_build_query($payload);
            $response = false;
            $status = 0;
            $error = '';
            $networkError = false;

            if (function_exists('curl_init')) {
                $ch = curl_init($this->url);
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $body,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_CONNECTTIMEOUT => 10,
                    CURLOPT_TIMEOUT => 35,
                    CURLOPT_SSL_VERIFYPEER => true,
                    CURLOPT_SSL_VERIFYHOST => 2,
                    CURLOPT_HTTPHEADER => ['Accept: application/json', 'Content-Type: application/x-www-form-urlencoded'],
                    CURLOPT_USERAGENT => 'BoostBangla-ProviderSync/1.0'
                ]);
                $response = curl_exec($ch);
                $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $error = (string)curl_error($ch);
                $networkError = $response === false || $error !== '';
                curl_close($ch);
            } else {
                $context = stream_context_create([
                    'http' => [
                        'method' => 'POST',
                        'header' => "Accept: application/json\r\nContent-Type: application/x-www-form-urlencoded\r\n",
                        'content' => $body,
                        'timeout' => 35,
                        'ignore_errors' => true
                    ],
                    'ssl' => ['verify_peer' => true, 'verify_peer_name' => true]
                ]);
                $response = @file_get_contents($this->url, false, $context);
                $networkError = $response === false;
                if ($networkError) $error = 'Provider network request failed.';
                $line = $http_response_header[0] ?? '';
                if (preg_match('/\s(\d{3})\s/', $line, $matches)) $status = (int)$matches[1];
            }

            $decoded = is_string($response) ? json_decode($response, true) : null;
            $providerError = is_array($decoded) && array_key_exists('error', $decoded)
                ? (is_string($decoded['error']) ? $decoded['error'] : json_encode($decoded['error']))
                : '';
            $ok = !$networkError && $status >= 200 && $status < 300 && is_array($decoded) && $providerError === '';

            return [
                'ok' => $ok,
                'status' => $status,
                'data' => $decoded,
                'error' => $ok ? '' : substr((string)($providerError ?: $error ?: 'Provider response validation failed.'), 0, 600),
                'network_error' => $networkError
            ];
        }

        public static function mapStatus($value) {
            $raw = strtolower(trim((string)$value));
            $map = [
                'pending' => 'pending',
                'processing' => 'processing',
                'inprogress' => 'processing',
                'in_progress' => 'processing',
                'completed' => 'completed',
                'partial' => 'partial',
                'cancelled' => 'cancelled',
                'canceled' => 'cancelled',
                'failed' => 'failed',
                'error' => 'failed',
                'refunded' => 'refunded'
            ];
            return $map[$raw] ?? 'pending';
        }
    }
}
