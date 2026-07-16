import { describe, expect, test } from "vitest";
import type {
  OntologicalBaseKind,
  SemanticMatch,
  UpdateOntologySchemaRequest,
} from "./index.js";

describe("semantic match type contract", () => {
  test("represents the evidence-backed accepted match wire shape", () => {
    const semanticMatch = {
      version: 1,
      template: { id: "global:thing/dependent-entity", version: 1 },
      status: "accepted",
      evidence: [{
        signal: "host_attachment",
        value: true,
        evidence_ref: {
          id: "ev:requirement-host",
          source_kind: "declared_structure",
          source_ref: "Requirement.APPLIES_TO",
        },
        confidence: 0.95,
      }],
      negative_control: {
        template: { id: "global:thing/entity", version: 1 },
        reason: "identity is derived from its source and subject",
      },
      bindings: {
        identity_mode: "derived",
        slots: [{
          name: "subject",
          template_slot: "subject",
          object_types: ["Product"],
          min: 1,
        }],
      },
      confidence: 0.94,
      rationale: "Evidence supports the dependent-entity template.",
      proposed_by: [{ id: "pinned-human", version: 1 }],
      decision: {
        actor: "reviewer",
        decided_at: "2026-07-15T00:00:00Z",
        rationale: "Accepted for the Voya baseline.",
        premises: ["ev:requirement-host"],
      },
    } satisfies SemanticMatch;

    expect(semanticMatch.status).toBe("accepted");
  });

  test("keeps base kinds and authoring modes distinct", () => {
    const baseKind: OntologicalBaseKind = "dependent_particular";
    const update = {
      semantic_validation_mode: "advisory",
    } satisfies UpdateOntologySchemaRequest;

    expect(baseKind).toBe("dependent_particular");
    expect(update.semantic_validation_mode).toBe("advisory");
  });
});
