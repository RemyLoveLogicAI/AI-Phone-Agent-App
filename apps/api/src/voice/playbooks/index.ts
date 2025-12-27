/**
 * CallOS Starter Playbooks
 *
 * Three production-ready playbooks for different use cases:
 * - Personal: AI gatekeeper for individuals
 * - Business: Always-on receptionist for SMBs
 * - Support: Tier-1 customer support agent
 */

export { PERSONAL_PLAYBOOK } from './personal.playbook';
export { BUSINESS_PLAYBOOK } from './business.playbook';
export { SUPPORT_PLAYBOOK } from './support.playbook';

/**
 * Get playbook by ID
 */
export function getPlaybookById(id: string): any {
  const playbooks = [
    require('./personal.playbook').PERSONAL_PLAYBOOK,
    require('./business.playbook').BUSINESS_PLAYBOOK,
    require('./support.playbook').SUPPORT_PLAYBOOK,
  ];

  return playbooks.find((p) => p.id === id);
}

/**
 * Get all starter playbooks
 */
export function getAllStarterPlaybooks(): any[] {
  return [
    require('./personal.playbook').PERSONAL_PLAYBOOK,
    require('./business.playbook').BUSINESS_PLAYBOOK,
    require('./support.playbook').SUPPORT_PLAYBOOK,
  ];
}

/**
 * Validate playbook schema
 */
export function validatePlaybook(playbook: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!playbook.id) errors.push('Missing required field: id');
  if (!playbook.name) errors.push('Missing required field: name');
  if (!playbook.version) errors.push('Missing required field: version');
  if (!playbook.persona) errors.push('Missing required field: persona');
  if (!playbook.openingVariants || playbook.openingVariants.length === 0) {
    errors.push('Missing or empty: openingVariants');
  }

  // Validate persona
  if (playbook.persona) {
    if (!playbook.persona.voiceId) {
      errors.push('Missing persona.voiceId');
    }
    if (typeof playbook.persona.speakingRate !== 'number') {
      errors.push('persona.speakingRate must be a number');
    }
    if (typeof playbook.persona.warmth !== 'number') {
      errors.push('persona.warmth must be a number');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
