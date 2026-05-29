'use strict';
const isAWS = !!(process.env.AWS_REGION && process.env.VAULT_MODE !== 'local');

async function get(orgId, tool) {
  if (isAWS) {
    const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    try {
      const secretId = `cyberrx/${orgId}/${tool}`;
      const resp = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
      return JSON.parse(resp.SecretString);
    } catch (e) {
      if (e.name === 'ResourceNotFoundException') return null;
      throw e;
    }
  } else {
    // Local/Docker: read from env vars  e.g. OKTA_APITOKEN, SNOW_INSTANCE, SNOW_USER
    const prefix = tool.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const apiKey  = process.env[prefix + '_APIKEY'] || process.env[prefix + '_APITOKEN'] || process.env[prefix + '_TOKEN'];
    const domain  = process.env[prefix + '_DOMAIN'] || process.env[prefix + '_INSTANCE'] || process.env[prefix + '_HOST'];
    if (!apiKey && !domain) return null;
    return {
      apiKey, apiToken: apiKey, token: apiKey,
      domain, instance: domain, host: domain,
      user: process.env[prefix + '_USER'],
      password: process.env[prefix + '_PASSWORD'],
      clientId: process.env[prefix + '_CLIENT_ID'],
      clientSecret: process.env[prefix + '_CLIENT_SECRET'],
      accessKey: process.env[prefix + '_ACCESS_KEY'],
      secretKey: process.env[prefix + '_SECRET_KEY'],
      assignGroup: process.env[prefix + '_ASSIGN_GROUP'] || 'IT Security',
      project: process.env[prefix + '_PROJECT'] || 'SEC',
      email: process.env[prefix + '_EMAIL'],
      port: process.env[prefix + '_PORT'],
    };
  }
}

async function set(orgId, tool, creds) {
  if (isAWS) {
    const { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    const secretId = `cyberrx/${orgId}/${tool}`;
    const secretString = JSON.stringify(creds);
    try {
      await client.send(new UpdateSecretCommand({ SecretId: secretId, SecretString: secretString }));
    } catch (e) {
      if (e.name === 'ResourceNotFoundException') {
        await client.send(new CreateSecretCommand({ Name: secretId, SecretString: secretString }));
      } else throw e;
    }
  }
  // Local: no-op — credentials live in .env
}

async function del(orgId, tool) {
  if (isAWS) {
    const { SecretsManagerClient, DeleteSecretCommand } = require('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    await client.send(new DeleteSecretCommand({
      SecretId: `cyberrx/${orgId}/${tool}`,
      ForceDeleteWithoutRecovery: true,
    }));
  }
}

module.exports = { get, set, delete: del };
