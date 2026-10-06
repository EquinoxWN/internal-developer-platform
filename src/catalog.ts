import {
  componentEntityV1alpha1Validator,
  DefaultNamespaceEntityPolicy,
  EntityPolicies,
  FieldFormatEntityPolicy,
  NoForeignRootFieldsEntityPolicy,
  resourceEntityV1alpha1Validator,
  SchemaValidEntityPolicy,
  type Entity,
} from "@backstage/catalog-model";
import { parseAllDocuments } from "yaml";

const policy = EntityPolicies.allOf([
  new DefaultNamespaceEntityPolicy(),
  new NoForeignRootFieldsEntityPolicy(),
  new FieldFormatEntityPolicy(),
  new SchemaValidEntityPolicy(),
]);
const kindValidators = [componentEntityV1alpha1Validator, resourceEntityV1alpha1Validator];

/**
 * Validate catalog-info.yaml text with Backstage's own catalog-model rules (entity envelope,
 * name formats, and the Component and Resource kind schemas). Returns one problem per invalid
 * document; an empty list means the catalog would accept the file.
 */
export async function validateCatalog(text: string): Promise<{ entities: Entity[]; problems: string[] }> {
  const entities: Entity[] = [];
  const problems: string[] = [];
  const docs = parseAllDocuments(text);
  for (const [i, doc] of docs.entries()) {
    if (doc.errors.length > 0) {
      problems.push(`document ${i + 1}: ${doc.errors[0]?.message}`);
      continue;
    }
    const entity = doc.toJS() as Entity;
    try {
      const checked = (await policy.enforce(entity)) ?? entity;
      let known = false;
      for (const validator of kindValidators) known = (await validator.check(checked)) || known;
      if (!known) throw new Error(`unsupported kind ${String(checked.kind)}`);
      entities.push(checked);
    } catch (e) {
      problems.push(`document ${i + 1} (${String(entity?.metadata?.name)}): ${(e as Error).message}`);
    }
  }
  return { entities, problems };
}
