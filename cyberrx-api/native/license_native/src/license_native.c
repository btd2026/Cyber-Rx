/*
 * license_native — the enforcement primitives, in native code.
 *
 * Moving Ed25519 verification and the fingerprint hash out of JavaScript and into
 * a compiled .node addon is the point of Layer 2: a JS check can be patched with a
 * text editor on a box the attacker owns; a native check must be defeated in the
 * compiled binary, and the integrity manifest turns any edit to the shipped .node
 * into a HARD tamper (seal + shred).
 *
 * Uses Node's bundled OpenSSL (headers come with the node-gyp header package; the
 * symbols are exported by the node binary on Linux), so there is NO external
 * library dependency — it compiles with node-gyp alone.
 *
 * Exposes:
 *   ed25519Verify(pubPem:string, msg:Buffer, sig:Buffer) -> boolean
 *   sha256Hex(data:Buffer) -> string   (lowercase hex)
 */

#include <node_api.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <openssl/evp.h>
#include <openssl/pem.h>
#include <openssl/bio.h>

static napi_value make_bool(napi_env env, int v) {
  napi_value r;
  napi_get_boolean(env, v ? 1 : 0, &r);
  return r;
}

static napi_value Ed25519Verify(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value args[3];
  if (napi_get_cb_info(env, info, &argc, args, NULL, NULL) != napi_ok || argc < 3) {
    return make_bool(env, 0);
  }

  /* arg0: public key, PEM string */
  size_t pemlen = 0;
  if (napi_get_value_string_utf8(env, args[0], NULL, 0, &pemlen) != napi_ok) return make_bool(env, 0);
  char *pem = (char *) malloc(pemlen + 1);
  if (!pem) return make_bool(env, 0);
  napi_get_value_string_utf8(env, args[0], pem, pemlen + 1, &pemlen);

  /* arg1: message bytes, arg2: signature bytes */
  void *msg = NULL; size_t msglen = 0;
  void *sig = NULL; size_t siglen = 0;
  if (napi_get_buffer_info(env, args[1], &msg, &msglen) != napi_ok ||
      napi_get_buffer_info(env, args[2], &sig, &siglen) != napi_ok) {
    free(pem);
    return make_bool(env, 0);
  }

  int ok = 0;
  BIO *bio = BIO_new_mem_buf(pem, (int) pemlen);
  EVP_PKEY *pkey = bio ? PEM_read_bio_PUBKEY(bio, NULL, NULL, NULL) : NULL;
  if (pkey) {
    EVP_MD_CTX *ctx = EVP_MD_CTX_new();
    /* Ed25519: md is NULL; one-shot EVP_DigestVerify. */
    if (ctx && EVP_DigestVerifyInit(ctx, NULL, NULL, NULL, pkey) == 1) {
      ok = (EVP_DigestVerify(ctx,
                             (const unsigned char *) sig, siglen,
                             (const unsigned char *) msg, msglen) == 1) ? 1 : 0;
    }
    if (ctx) EVP_MD_CTX_free(ctx);
    EVP_PKEY_free(pkey);
  }
  if (bio) BIO_free(bio);
  free(pem);
  return make_bool(env, ok);
}

static napi_value Sha256Hex(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  if (napi_get_cb_info(env, info, &argc, args, NULL, NULL) != napi_ok || argc < 1) {
    napi_value empty; napi_create_string_utf8(env, "", 0, &empty); return empty;
  }
  void *data = NULL; size_t len = 0;
  napi_get_buffer_info(env, args[0], &data, &len);

  unsigned char md[EVP_MAX_MD_SIZE];
  unsigned int mdlen = 0;
  if (EVP_Digest(data, len, md, &mdlen, EVP_sha256(), NULL) != 1) {
    napi_value empty; napi_create_string_utf8(env, "", 0, &empty); return empty;
  }
  char hex[EVP_MAX_MD_SIZE * 2 + 1];
  for (unsigned int i = 0; i < mdlen; i++) sprintf(hex + i * 2, "%02x", md[i]);
  hex[mdlen * 2] = '\0';

  napi_value r;
  napi_create_string_utf8(env, hex, mdlen * 2, &r);
  return r;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn;
  napi_create_function(env, NULL, 0, Ed25519Verify, NULL, &fn);
  napi_set_named_property(env, exports, "ed25519Verify", fn);
  napi_create_function(env, NULL, 0, Sha256Hex, NULL, &fn);
  napi_set_named_property(env, exports, "sha256Hex", fn);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
