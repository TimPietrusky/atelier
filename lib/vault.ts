import { workos } from "./workos"

export interface VaultContext {
  userId: string
  orgId?: string
  providerId: string
}

export async function storeSecret(
  context: VaultContext,
  secret: string
): Promise<string> {
  // WorkOS Vault API: createSecret stores the secret and returns id
  // The vault context is stored in the KeyContext
  const result = await workos.vault.createSecret({
    name: `${context.userId}:${context.providerId}`,
    value: secret,
    context: {
      userId: context.userId,
      orgId: context.orgId,
      providerId: context.providerId,
    },
  })

  return result.id
}

export async function retrieveSecret(
  context: VaultContext,
  secretId: string
): Promise<string> {
  const result = await workos.vault.readSecret({
    id: secretId,
  })

  // VaultObject has a `value` field, not `data`
  return result.value || ""
}

export async function deleteSecret(secretId: string): Promise<void> {
  await workos.vault.deleteSecret({
    id: secretId,
  })
}

