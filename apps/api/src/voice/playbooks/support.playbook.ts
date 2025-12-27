/**
 * CallOS Support Playbook
 *
 * For customer support operations - Tier-1 triage, FAQ handling,
 * and escalation routing.
 *
 * Features:
 * - Issue classification and severity assessment
 * - Ticket creation and tracking
 * - Self-service option offering
 * - Knowledge base integration
 * - Smart escalation to human agents
 */

export const SUPPORT_PLAYBOOK = {
  id: 'playbook_support_v1',
  name: 'Customer Support',
  version: '1.0.0',
  author: 'LoveLogicAI',
  isActive: true,

  // Persona configuration
  persona: {
    voiceId: 'professional-female-us',
    speakingRate: 0.95, // Slightly slower for clarity
    warmth: 0.9, // More empathetic
  },

  // Opening variants
  openingVariants: [
    'Thank you for calling {company_name} support. How can I help you today?',
    'Hi! You\'ve reached {company_name} support. What issue can I help you with?',
    '{company_name} support. I\'m here to help. What\'s going on?',
  ],

  // Qualification flow (issue triage)
  qualificationFlow: [
    {
      question: 'May I have your name and account number or email?',
      entity: ['caller_name', 'account_identifier'],
      required: true,
    },
    {
      question: 'What issue are you experiencing?',
      entity: 'issue_description',
      required: true,
    },
    {
      question: 'When did this issue start?',
      entity: 'issue_start_time',
      required: false,
    },
    {
      question: 'Is this preventing you from using the product or service?',
      entity: 'severity',
      required: true,
      disqualifyOn: 'no', // If not critical, offer self-service
    },
    {
      question: 'Have you tried any troubleshooting steps already?',
      entity: 'attempted_solutions',
      required: false,
    },
  ],

  // Tool permissions
  toolPermissions: {
    // Auto-execute
    create_ticket: {
      mode: 'auto',
      trustTierRequired: 0,
    },
    send_troubleshooting_guide: {
      mode: 'auto',
      trustTierRequired: 0,
    },
    send_sms: {
      mode: 'auto',
      rateLimit: '10/hour',
    },
    update_ticket: {
      mode: 'auto',
      trustTierRequired: 0,
    },
    log_customer_interaction: {
      mode: 'auto',
      trustTierRequired: 0,
    },

    // Confirm first
    schedule_callback: {
      mode: 'auto',
      trustTierRequired: 1,
      allowedWindows: ['9am-5pm weekdays'],
    },
    send_replacement: {
      mode: 'confirm_first',
      trustTierRequired: 2,
    },

    // Require approval
    issue_refund: {
      mode: 'require_approval',
      trustTierRequired: 3,
      requiresManager: true,
    },
    apply_credit: {
      mode: 'require_approval',
      trustTierRequired: 3,
      requiresManager: true,
    },
    escalate_to_tier2: {
      mode: 'confirm_first',
      trustTierRequired: 1,
    },
  },

  // Escalation triggers
  escalationTriggers: [
    'critical_issue', // Severity > 0.8
    'angry_customer', // Frustration index > 0.7
    'repeated_contact', // Called multiple times
    'legal_threat',
    'refund_request',
    'security_issue',
    'data_breach_concern',
    'executive_escalation_request',
  ],

  // Compliance
  compliance: {
    disclosures: [
      'This call may be recorded for quality and training purposes.',
      'You are speaking with an AI assistant. I can escalate to a human agent if needed.',
    ],
    consentRequired: ['recording'],
  },

  // Retention
  retention: {
    transcript: '365_days', // Keep support transcripts for a year
    recording: '90_days',
  },

  // Issue classification
  issueClassification: {
    categories: [
      {
        category: 'technical',
        keywords: ['error', 'crash', 'bug', 'not working', 'broken'],
        severity: 'medium',
      },
      {
        category: 'account',
        keywords: ['login', 'password', 'access', 'locked out'],
        severity: 'high',
      },
      {
        category: 'billing',
        keywords: ['charge', 'payment', 'invoice', 'refund'],
        severity: 'high',
        requireVerification: true,
      },
      {
        category: 'feature_request',
        keywords: ['feature', 'add', 'wishlist', 'suggestion'],
        severity: 'low',
      },
      {
        category: 'security',
        keywords: ['hack', 'breach', 'unauthorized', 'suspicious'],
        severity: 'critical',
        immediateEscalation: true,
      },
    ],

    severityLevels: {
      critical: {
        score: 1.0,
        escalate: true,
        sla: '15_minutes',
        notifyManager: true,
      },
      high: {
        score: 0.8,
        escalate: false,
        sla: '2_hours',
        notifyManager: false,
      },
      medium: {
        score: 0.5,
        escalate: false,
        sla: '24_hours',
        offerSelfService: true,
      },
      low: {
        score: 0.2,
        escalate: false,
        sla: '48_hours',
        offerSelfService: true,
      },
    },
  },

  // Self-service options
  selfService: {
    enabled: true,
    offerThreshold: 0.5, // Offer if severity < 0.5

    options: [
      {
        type: 'knowledge_base_article',
        trigger: ['how to', 'tutorial', 'guide'],
        delivery: 'sms',
      },
      {
        type: 'troubleshooting_guide',
        trigger: ['not working', 'error', 'problem'],
        delivery: 'email',
      },
      {
        type: 'video_tutorial',
        trigger: ['show me', 'demo', 'walkthrough'],
        delivery: 'sms',
      },
      {
        type: 'faq',
        trigger: ['question', 'wondering', 'curious'],
        delivery: 'interactive',
      },
    ],

    followupScript:
      'I\'ve sent you {resource_type} that should help. If that doesn\'t resolve your issue, I can create a ticket for our team to follow up.',
  },

  // Conversation strategies
  strategies: {
    empathy_first: {
      enabled: true,
      acknowledgmentPhrases: [
        "I understand how frustrating that must be.",
        "I'm sorry you're experiencing this issue.",
        "Let's get this sorted out for you.",
        "I appreciate your patience.",
      ],
    },

    active_listening: {
      enabled: true,
      confirmUnderstanding: true,
      summarizeIssue: true,
      askClarifyingQuestions: true,
    },

    solution_focused: {
      enabled: true,
      offerImmediateSolutions: true,
      explainSteps: true,
      setExpectations: true,
    },

    de_escalation: {
      enabled: true,
      frustrationThreshold: 0.6,
      techniques: [
        'acknowledge_feelings',
        'apologize_sincerely',
        'offer_immediate_action',
        'escalate_if_needed',
      ],
      escalationScript:
        "I want to make sure you get the best possible help. Let me connect you with a senior support specialist who can assist you further.",
    },

    follow_through: {
      enabled: true,
      provideTicketNumber: true,
      setExpectations: true,
      offerCallback: true,
      sendConfirmation: true,
    },
  },

  // Knowledge base integration
  knowledgeBase: {
    enabled: true,
    searchEnabled: true,
    autoSuggest: true,

    commonIssues: [
      {
        issue: 'password_reset',
        keywords: ['password', 'reset', 'forgot', 'login'],
        solution:
          'You can reset your password at {reset_url}. I can also send you a reset link via email or SMS.',
        successRate: 0.95,
      },
      {
        issue: 'account_locked',
        keywords: ['locked', 'access', 'cannot login'],
        solution:
          'Your account may be temporarily locked for security. I can unlock it for you after verifying your identity.',
        requiresVerification: true,
        successRate: 0.90,
      },
      {
        issue: 'payment_failed',
        keywords: ['payment', 'declined', 'failed'],
        solution:
          'Payment failures are usually due to incorrect card information or insufficient funds. Would you like to update your payment method?',
        successRate: 0.85,
      },
      {
        issue: 'feature_not_found',
        keywords: ['where is', 'cannot find', 'missing'],
        solution:
          'Let me help you locate that feature. Can you describe what you\'re trying to do?',
        successRate: 0.80,
      },
    ],
  },

  // Ticket creation
  ticketing: {
    enabled: true,
    autoCreate: true,
    captureFields: [
      'caller_name',
      'account_identifier',
      'issue_description',
      'severity',
      'category',
      'attempted_solutions',
      'desired_outcome',
    ],

    priorityMapping: {
      critical: 'P0',
      high: 'P1',
      medium: 'P2',
      low: 'P3',
    },

    assignmentRules: {
      security: 'security_team',
      billing: 'billing_team',
      technical: 'tech_support',
      account: 'account_management',
      feature_request: 'product_team',
    },
  },

  // Customer satisfaction
  csat: {
    enabled: true,
    askAtEnd: true,
    question: 'On a scale of 1 to 5, how satisfied are you with this interaction?',
    followupIfLow: true,
    escalateThreshold: 2, // If rating <= 2, escalate
  },
};
