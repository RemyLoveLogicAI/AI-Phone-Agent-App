/**
 * CallOS Personal Playbook
 *
 * For individuals who want an AI gatekeeper + coordinator that never
 * forgets and never gets socially manipulated.
 *
 * Features:
 * - Screens unknown callers
 * - Blocks spam automatically
 * - Takes messages for known contacts
 * - Handles appointment scheduling
 */

export const PERSONAL_PLAYBOOK = {
  id: 'playbook_personal_v1',
  name: 'Personal Assistant',
  version: '1.0.0',
  author: 'LoveLogicAI',
  isActive: true,

  // Persona configuration
  persona: {
    voiceId: 'professional-female-us',
    speakingRate: 1.0,
    warmth: 0.8,
  },

  // Opening variants
  openingVariants: [
    "Hello, you've reached {owner_name}'s assistant. How can I help you today?",
    "Hi there! I'm {owner_name}'s assistant. What can I do for you?",
    "Good {time_of_day}! You've reached {owner_name}. How may I assist you?",
  ],

  // Qualification flow
  qualificationFlow: [
    {
      question: 'May I have your name, please?',
      entity: 'caller_name',
      required: true,
    },
    {
      question: 'What is this regarding?',
      entity: 'call_purpose',
      required: true,
    },
    {
      question: 'Is this urgent, or can I take a message?',
      entity: 'urgency',
      required: false,
    },
  ],

  // Tool permissions
  toolPermissions: {
    // Auto-execute for trusted callers
    send_sms: {
      mode: 'auto',
      trustTierRequired: 1,
      rateLimit: '5/hour',
    },
    create_reminder: {
      mode: 'auto',
      trustTierRequired: 1,
    },
    take_message: {
      mode: 'auto',
      trustTierRequired: 0,
    },

    // Confirm first
    schedule_appointment: {
      mode: 'confirm_first',
      trustTierRequired: 2,
      allowedWindows: ['9am-5pm weekdays'],
      maxDuration: '60min',
    },

    // Require approval
    forward_call: {
      mode: 'require_approval',
      trustTierRequired: 2,
    },
  },

  // Escalation triggers
  escalationTriggers: [
    'legal_threat',
    'emergency_keyword',
    'vip_caller',
    'distress_detected',
    'explicit_request_for_owner',
  ],

  // Compliance
  compliance: {
    disclosures: [
      'This call may be recorded for quality and training purposes.',
    ],
    consentRequired: ['recording'],
  },

  // Retention
  retention: {
    transcript: '90_days',
    recording: '30_days',
  },

  // Conversation strategies
  strategies: {
    spam_handling: {
      scamConfidenceThreshold: 0.7,
      autoRejectScript:
        "I'm sorry, but this seems like an automated or promotional call. If you have legitimate business, please send details via email. Goodbye.",
      blockOnReject: true,
    },

    unknown_caller_handling: {
      requireVerification: false,
      politeScreening: true,
      takeMessageByDefault: true,
      script:
        "{owner_name} isn't available right now. Can I take a message or schedule a callback?",
    },

    vip_handling: {
      immediateEscalation: true,
      notificationMethod: 'push',
      greeting: "Hello {caller_name}! I'll connect you right away.",
    },

    message_taking: {
      captureDetails: ['caller_name', 'phone_number', 'purpose', 'urgency'],
      confirmationScript:
        "I've noted your message and will make sure {owner_name} receives it. Is there anything else?",
      sendConfirmationSMS: true,
    },
  },

  // Boundary protection
  boundaries: {
    refuseHarassment: true,
    blockRepeatedRejections: true,
    maxCallsPerDayPerNumber: 3,
    politeTerminationScript:
      "I'm going to end this call now. Please contact us through official channels if you have legitimate business. Goodbye.",
  },
};
