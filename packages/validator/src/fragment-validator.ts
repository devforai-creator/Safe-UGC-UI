/**
 * @safe-ugc-ui/validator — Fragment Validator
 *
 * Validates fragment references and the non-recursive fragment rules for v0.9.
 */

import { createError, type ValidationError } from './result.js';
import { walkRenderableCard } from './renderable-walk.js';
import { isFragmentUseLike } from './traverse.js';

const FRAGMENT_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function validateFragments(
  views: Record<string, unknown>,
  fragments?: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (fragments) {
    for (const fragmentName of Object.keys(fragments)) {
      if (!FRAGMENT_NAME_PATTERN.test(fragmentName)) {
        errors.push(
          createError(
            'INVALID_FRAGMENT_NAME',
            `Fragment name "${fragmentName}" is invalid; must match /^[A-Za-z][A-Za-z0-9_-]*$/.`,
            `fragments.${fragmentName}`,
          ),
        );
      }
    }
  }

  walkRenderableCard(views, fragments, (node, context) => {
    if (!isFragmentUseLike(node)) {
      return;
    }

    if (context.inFragments) {
      errors.push(
        createError(
          'FRAGMENT_NESTED_USE',
          `Fragments may not contain "$use" references. Found at "${context.path}".`,
          context.path,
        ),
      );
      return;
    }

    if (!fragments || !(node.$use in fragments)) {
      errors.push(
        createError(
          'FRAGMENT_REF_NOT_FOUND',
          `Fragment "${node.$use}" was not found.`,
          context.path,
        ),
      );
    }
  });

  return errors;
}
