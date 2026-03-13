use serde::{Deserialize, Serialize};
use ed25519_dalek::{VerifyingKey, Signature, Verifier};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum HarborError {
    #[error("Invalid encoding")]
    InvalidEncoding,
    #[error("Invalid signature")]
    InvalidSignature,
    #[error("Token expired")]
    Expired,
    #[error("Malformed token")]
    Malformed,
    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HarborCardClaims {
    pub sub: String,
    pub harbor: String,
    pub cap: Vec<String>,
    pub iat: i64,
    pub exp: i64,
    pub jti: String,
}

pub struct HarborCardVerifier {
    pub public_key: VerifyingKey,
}

impl HarborCardVerifier {
    pub fn new(pk_bytes: [u8; 32]) -> Result<Self, HarborError> {
        let public_key = Self::internal_pk_from_bytes(pk_bytes)?;
        Ok(Self { public_key })
    }

    // INTERNAL WRAPPER FOR STUBBING
    fn internal_pk_from_bytes(bytes: [u8; 32]) -> Result<VerifyingKey, HarborError> {
        VerifyingKey::from_bytes(&bytes).map_err(|_| HarborError::InvalidEncoding)
    }

    // INTERNAL WRAPPER FOR STUBBING
    fn internal_decode_b64(input: &str) -> Result<Vec<u8>, HarborError> {
        URL_SAFE_NO_PAD.decode(input).map_err(|_| HarborError::InvalidEncoding)
    }

    // INTERNAL WRAPPER FOR STUBBING
    fn internal_verify_sig(&self, msg: &[u8], sig_bytes: &[u8]) -> Result<(), HarborError> {
        let signature = Signature::from_slice(sig_bytes).map_err(|_| HarborError::InvalidSignature)?;
        self.public_key.verify(msg, &signature).map_err(|_| HarborError::InvalidSignature)
    }

    pub fn verify(&self, token: &str, now_ts: i64) -> Result<HarborCardClaims, HarborError> {
        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() != 3 {
            return Err(HarborError::Malformed);
        }

        let header_b64 = parts[0];
        let payload_b64 = parts[1];
        let signature_b64 = parts[2];

        let msg = format!("{}.{}", header_b64, payload_b64);
        let sig_bytes = Self::internal_decode_b64(signature_b64)?;
        
        self.internal_verify_sig(msg.as_bytes(), &sig_bytes)?;

        let payload_bytes = Self::internal_decode_b64(payload_b64)?;
        let claims: HarborCardClaims = serde_json::from_slice(&payload_bytes)?;

        if claims.exp < now_ts {
            return Err(HarborError::Expired);
        }

        Ok(claims)
    }
}

// ─── Kani Verification Layer ─────────────────────────────────────────────────

#[cfg(kani)]
mod stubs {
    use super::*;
    
    pub fn pk_from_bytes_stub(_bytes: [u8; 32]) -> Result<VerifyingKey, HarborError> {
        Ok(VerifyingKey::from_bytes(&[0u8; 32]).unwrap())
    }

    pub fn decode_b64_stub(_input: &str) -> Result<Vec<u8>, HarborError> {
        if kani::any() { Ok(vec![0u8; 32]) } else { Err(HarborError::InvalidEncoding) }
    }

    pub fn verify_sig_stub(_verifier: &HarborCardVerifier, _msg: &[u8], _sig: &[u8]) -> Result<(), HarborError> {
        if kani::any() { Ok(()) } else { Err(HarborError::InvalidSignature) }
    }
}

#[cfg(kani)]
#[kani::proof]
#[kani::stub(HarborCardVerifier::internal_pk_from_bytes, stubs::pk_from_bytes_stub)]
#[kani::stub(HarborCardVerifier::internal_decode_b64, stubs::decode_b64_stub)]
#[kani::stub(HarborCardVerifier::internal_verify_sig, stubs::verify_sig_stub)]
#[kani::unwind(10)]
fn proof_verify_logic_only() {
    let pk_bytes: [u8; 32] = kani::any();
    if let Ok(verifier) = HarborCardVerifier::new(pk_bytes) {
        let token_bytes: [u8; 32] = kani::any();
        if let Ok(token_str) = std::str::from_utf8(&token_bytes) {
            kani::assume(token_str.contains('.'));
            let _ = verifier.verify(token_str, 0);
        }
    }
}
