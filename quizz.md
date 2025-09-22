// =============================================
// QUIZ LURNIX AMÉLIORÉ - PLUS ENGAGEANT
// =============================================

// Problèmes identifiés dans le quiz actuel :
const currentQuizIssues = [
  "❌ Questions trop académiques ('In a lecture setting...')",
  "❌ Pas assez de contexte concret de développement", 
  "❌ Manque de questions révélatrices sur la personnalité d'apprentissage",
  "❌ Peu de questions sur la gestion de la frustration/échec",
  "❌ Questions binaires qui forcent des choix artificiels",
  "❌ Pas assez axé sur les situations réelles de dev"
];

// =============================================
// NOUVELLES SECTIONS PLUS ENGAGEANTES
// =============================================

const improvedSections = [
  {
    title: "🧠 Ton Style d'Apprentissage Naturel",
    description: "Découvrons comment tu apprends naturellement",
    sortOrder: 1,
    questions: "scenarios_apprentissage"
  },
  {
    title: "🎯 Tes Motivations Profondes", 
    description: "Qu'est-ce qui te drive vraiment ?",
    sortOrder: 2,
    questions: "motivations_profondes"
  },
  {
    title: "🔥 Tes Passions Tech",
    description: "Dans quoi veux-tu exceller ?", 
    sortOrder: 3,
    questions: "passions_tech"
  },
  {
    title: "💪 Ton Rapport aux Défis",
    description: "Comment réagis-tu face aux obstacles ?",
    sortOrder: 4, 
    questions: "gestion_defis"
  }
];

// =============================================
// SECTION 1 : SCÉNARIOS D'APPRENTISSAGE RÉELS
// =============================================

const section1ImprovedQuestions = [
  {
    key: 'new_framework_scenario',
    title: '🚀 Ton équipe adopte un nouveau framework (ex: Vue.js). Comment tu t\'y prends ?',
    description: 'Sois honnête sur ton premier réflexe !',
    type: 'single',
    options: [
      {
        label: '📺 Je regarde des tutos YouTube pour voir ça en action',
        value: 'visual_first',
        weights: { visual: 3, practical: 2, analytical: 1 }
      },
      {
        label: '📖 Je lis la doc officielle pour comprendre les concepts',
        value: 'documentation_first', 
        weights: { analytical: 3, visual: 1, practical: 1 }
      },
      {
        label: '⚡ Je clone un projet exemple et je commence à modifier',
        value: 'hands_on_first',
        weights: { practical: 3, visual: 1, analytical: 1 }
      },
      {
        label: '🗣️ Je demande à un collègue de m\'expliquer les bases',
        value: 'social_first',
        weights: { social: 3, visual: 2, practical: 1 }
      }
    ]
  },
  
  {
    key: 'bug_hunting_preference',
    title: '🐛 Tu as un bug mystérieux qui casse ton app. Ton instinct c\'est quoi ?',
    description: '',
    type: 'single', 
    options: [
      {
        label: '🔬 J\'analyse méthodiquement les logs et stack traces',
        value: 'analytical_debug',
        weights: { analytical: 3, systematic: 3, intuitive: 1 }
      },
      {
        label: '🎯 J\'essaie différentes solutions jusqu\'à ce que ça marche',
        value: 'experimental_debug',
        weights: { practical: 3, intuitive: 2, systematic: 1 }
      },
      {
        label: '📱 Je pose le problème sur Stack Overflow / Discord',
        value: 'community_debug', 
        weights: { social: 3, practical: 1, analytical: 1 }
      },
      {
        label: '🚶 Je fais une pause, parfois l\'inspiration vient en marchant',
        value: 'reflective_debug',
        weights: { intuitive: 3, analytical: 1, social: 1 }
      }
    ]
  },

  {
    key: 'learning_retention',
    title: '🧠 Une semaine après avoir appris un concept, tu te souviens mieux si...',
    description: '',
    type: 'single',
    options: [
      {
        label: '👁️ J\'ai vu des schémas/diagrammes qui l\'illustraient',
        value: 'visual_memory',
        weights: { visual: 3, practical: 1 }
      },
      {
        label: '⚡ J\'ai codé quelque chose avec ce concept',
        value: 'practical_memory', 
        weights: { practical: 3, visual: 1 }
      },
      {
        label: '💭 J\'ai discuté/expliqué ce concept à quelqu\'un',
        value: 'social_memory',
        weights: { social: 3, analytical: 2 }
      },
      {
        label: '📝 J\'ai pris des notes détaillées dessus',
        value: 'analytical_memory',
        weights: { analytical: 3, visual: 1 }
      }
    ]
  },

  {
    key: 'project_approach',
    title: '🏗️ Nouveau projet perso : une app de gestion de tâches. Par quoi tu commences ?',
    description: '',
    type: 'single',
    options: [
      {
        label: '🎨 Je dessine/maquette l\'interface utilisateur',
        value: 'ui_first',
        weights: { visual: 3, creative: 2, systematic: 1 }
      },
      {
        label: '🏛️ Je réfléchis à l\'architecture et base de données',
        value: 'architecture_first', 
        weights: { analytical: 3, systematic: 3, creative: 1 }
      },
      {
        label: '⚡ Je code directement une première version basique',
        value: 'mvp_first',
        weights: { practical: 3, creative: 1, systematic: 1 }
      },
      {
        label: '📊 J\'étudie les solutions existantes pour m\'inspirer',
        value: 'research_first',
        weights: { analytical: 2, social: 1, systematic: 2 }
      }
    ]
  }
];

// =============================================
// SECTION 2 : MOTIVATIONS PROFONDES 
// =============================================

const section2ImprovedQuestions = [
  {
    key: 'coding_dream',
    title: '✨ Dans tes rêves les plus fous, le code te permet de...',
    description: 'Laisse parler ton imagination !',
    type: 'single',
    options: [
      {
        label: '🌍 Créer quelque chose qui aide des millions de personnes',
        value: 'impact_global',
        weights: { altruist: 3, ambitious: 2, practical: 1 }
      },
      {
        label: '💰 Gagner ma liberté financière et travailler d\'où je veux', 
        value: 'freedom_lifestyle',
        weights: { independence: 3, practical: 2, ambitious: 2 }
      },
      {
        label: '🧠 Résoudre des problèmes techniques complexes et fascinants',
        value: 'intellectual_challenge',
        weights: { analytical: 3, perfectionist: 2, practical: 1 }
      },
      {
        label: '🎨 Exprimer ma créativité et construire des trucs beaux/innovants',
        value: 'creative_expression', 
        weights: { creative: 3, visual: 2, perfectionist: 1 }
      },
      {
        label: '🏢 Rejoindre une équipe tech cool et apprendre des meilleurs',
        value: 'team_growth',
        weights: { social: 3, analytical: 1, ambitious: 2 }
      }
    ]
  },

  {
    key: 'frustration_trigger',
    title: '😤 Qu\'est-ce qui te frustre LE PLUS quand tu apprends ?',
    description: 'On veut éviter ça dans ta roadmap !',
    type: 'single',
    options: [
      {
        label: '🐌 Les explications trop longues, je veux passer à la pratique',
        value: 'impatient_practical',
        weights: { practical: 3, impatient: 2, analytical: -1 }
      },
      {
        label: '📖 Quand on saute les explications, j\'ai besoin de comprendre le "pourquoi"',
        value: 'need_theory',
        weights: { analytical: 3, systematic: 2, practical: -1 }
      },
      {
        label: '😵 Les concepts abstraits sans exemples concrets',
        value: 'need_examples',
        weights: { visual: 3, practical: 2, analytical: 1 }
      },
      {
        label: '🏃 Aller trop vite, j\'ai besoin de temps pour digérer',
        value: 'need_time',
        weights: { methodical: 3, reflective: 2, impatient: -2 }
      },
      {
        label: '🏝️ Apprendre seul dans mon coin, j\'ai besoin d\'interaction',
        value: 'need_community',
        weights: { social: 3, independent: -1, collaborative: 2 }
      }
    ]
  },

  {
    key: 'success_feeling',
    title: '🎉 Tu te sens le plus fier quand...',
    description: '',
    type: 'single',
    options: [
      {
        label: '⚡ Mon code marche du premier coup',
        value: 'clean_execution',
        weights: { perfectionist: 3, analytical: 2 }
      },
      {
        label: '🚀 J\'ai terminé un projet complet, même imparfait',
        value: 'completion_focus',
        weights: { practical: 3, ambitious: 2, perfectionist: -1 }
      },
      {
        label: '🤝 J\'ai aidé quelqu\'un d\'autre à comprendre',
        value: 'teaching_satisfaction',
        weights: { social: 3, altruist: 2, analytical: 1 }
      },
      {
        label: '🔧 J\'ai résolu un bug vraiment tordu',
        value: 'problem_solving_satisfaction',
        weights: { analytical: 3, persistent: 2, perfectionist: 1 }
      },
      {
        label: '💡 J\'ai eu une idée créative qui fonctionne',
        value: 'innovation_satisfaction',
        weights: { creative: 3, intuitive: 2, analytical: 1 }
      }
    ]
  },

  {
    key: 'time_availability',
    title: '⏰ Côté temps, ta situation c\'est plutôt...',
    description: 'Pour qu\'on adapte le rythme !',
    type: 'single',
    options: [
      {
        label: '🔥 J\'ai du temps et je veux foncer (15h+/semaine)',
        value: 'intensive_time',
        weights: { intensive: 3, ambitious: 2 }
      },
      {
        label: '⚖️ Équilibre vie/apprentissage (5-10h/semaine)',
        value: 'balanced_time',
        weights: { balanced: 3, methodical: 2 }
      },
      {
        label: '🏃 Emploi du temps serré mais motivé (2-5h/semaine)',
        value: 'constrained_time', 
        weights: { efficient: 3, practical: 2, balanced: 1 }
      },
      {
        label: '🌊 Ça dépend des semaines, c\'est irrégulier',
        value: 'irregular_time',
        weights: { flexible: 3, adaptive: 2 }
      }
    ]
  }
];

// =============================================
// SECTION 3 : PASSIONS TECH (Plus spécifique)
// =============================================

const section3ImprovedQuestions = [
  {
    key: 'demo_excitement',
    title: '🤩 Quelle démo te ferait le plus kiffer ?',
    description: 'Imagine qu\'on te montre ça en 5 minutes',
    type: 'single',
    options: [
      {
        label: '🎨 Une interface utilisateur magnifique qui s\'anime parfaitement',
        value: 'ui_excitement',
        weights: { frontend: 3, visual: 3, creative: 2 }
      },
      {
        label: '🤖 Une IA qui génère du code ou répond aux questions',
        value: 'ai_excitement',
        weights: { ai_ml: 3, analytical: 2, innovative: 3 }
      },
      {
        label: '📊 Des données transformées en insights/graphiques interactifs',
        value: 'data_excitement',
        weights: { data_science: 3, analytical: 3, visual: 1 }
      },
      {
        label: '⚡ Une API qui traite des milliers de requêtes par seconde',
        value: 'backend_excitement',
        weights: { backend: 3, performance: 3, analytical: 2 }
      },
      {
        label: '🎮 Un jeu ou une expérience interactive immersive',
        value: 'interactive_excitement',
        weights: { gamedev: 3, creative: 3, visual: 2 }
      },
      {
        label: '🔐 Un système de sécurité qui bloque des attaques en temps réel',
        value: 'security_excitement',
        weights: { security: 3, analytical: 3, systematic: 2 }
      }
    ]
  },

  {
    key: 'first_project_dream',
    title: '🏗️ Ton premier "vrai" projet, tu rêves que ce soit...',
    description: '',
    type: 'single',
    options: [
      {
        label: '📱 Une app mobile que tes amis utilisent vraiment',
        value: 'mobile_app_dream',
        weights: { mobile: 3, social: 2, practical: 3 }
      },
      {
        label: '🌐 Un site web pour une cause qui te tient à cœur',
        value: 'website_cause_dream',
        weights: { frontend: 3, altruist: 3, visual: 2 }
      },
      {
        label: '🔧 Un outil qui automatise une tâche chiante de ton travail/vie',
        value: 'automation_dream',
        weights: { backend: 2, practical: 3, efficiency: 3 }
      },
      {
        label: '🎮 Un petit jeu ou une expérience interactive fun',
        value: 'game_dream',
        weights: { gamedev: 3, creative: 3, visual: 2 }
      },
      {
        label: '📈 Un dashboard qui track quelque chose qui t\'intéresse',
        value: 'dashboard_dream',
        weights: { data_science: 3, visual: 2, analytical: 2 }
      },
      {
        label: '🚀 Contribuer à un projet open source que tu utilises',
        value: 'opensource_dream',
        weights: { backend: 2, social: 3, altruist: 2 }
      }
    ]
  },

  {
    key: 'tech_personality',
    title: '🧬 Niveau personnalité tech, tu te reconnais où ?',
    description: '',
    type: 'single',
    options: [
      {
        label: '🎨 Le Designer-Dev : Interface + UX sont ma priorité',
        value: 'designer_dev',
        weights: { frontend: 3, visual: 3, creative: 2, perfectionist: 2 }
      },
      {
        label: '⚡ Le Speed-Runner : J\'aime livrer vite et itérer',
        value: 'speed_runner',
        weights: { practical: 3, agile: 3, efficient: 2, perfectionist: -1 }
      },
      {
        label: '🔬 L\'Architecte : Structure et best practices avant tout',
        value: 'architect',
        weights: { backend: 3, systematic: 3, analytical: 2, perfectionist: 2 }
      },
      {
        label: '🌟 L\'Innovateur : J\'aime expérimenter les nouvelles techs',
        value: 'innovator', 
        weights: { innovative: 3, experimental: 3, adaptive: 2, systematic: -1 }
      },
      {
        label: '🎯 Le Problem-Solver : Donnez-moi un défi technique complexe',
        value: 'problem_solver',
        weights: { analytical: 3, persistent: 3, perfectionist: 2, social: -1 }
      },
      {
        label: '🤝 Le Team Player : Collaboration et partage de connaissances',
        value: 'team_player',
        weights: { social: 3, collaborative: 3, altruist: 2, independent: -1 }
      }
    ]
  }
];

// =============================================
// SECTION 4 : GESTION DES DÉFIS
// =============================================

const section4ImprovedQuestions = [
  {
    key: 'stuck_reaction',
    title: '😰 Tu es bloqué depuis 2h sur un problème. Que fais-tu ?',
    description: 'Sois honnête !',
    type: 'single',
    options: [
      {
        label: '😤 Je m\'acharne jusqu\'à trouver, quitte à y passer la nuit',
        value: 'persistent_fighter',
        weights: { persistent: 3, independent: 2, stubborn: 2 }
      },
      {
        label: '🔄 Je prends une pause, souvent la solution vient après',
        value: 'strategic_pauser',
        weights: { reflective: 3, intuitive: 2, balanced: 2 }
      },
      {
        label: '🆘 Je demande de l\'aide sur Discord/forum assez vite',
        value: 'help_seeker',
        weights: { social: 3, collaborative: 2, efficient: 2 }
      },
      {
        label: '📚 Je retourne aux bases/doc pour mieux comprendre',
        value: 'knowledge_builder',
        weights: { analytical: 3, systematic: 2, methodical: 2 }
      },
      {
        label: '🔀 Je contourne le problème et reviens dessus plus tard',
        value: 'pragmatic_workaround',
        weights: { practical: 3, adaptive: 2, efficient: 2 }
      }
    ]
  },

  {
    key: 'failure_recovery',
    title: '💥 Ton code plante en production (ou ta démo rate). Ta réaction ?',
    description: '',
    type: 'single',
    options: [
      {
        label: '🔥 Stress maximal, je panique et ça m\'affecte',
        value: 'stress_reactive',
        weights: { emotional: 3, perfectionist: 2, anxious: 2 }
      },
      {
        label: '🎯 Mode tunnel vision : je fixe jusqu\'à ce que ça marche',
        value: 'tunnel_fixer',
        weights: { persistent: 3, analytical: 2, stubborn: 1 }
      },
      {
        label: '😅 "Oops!" - j\'apprends de l\'erreur et j\'avance',
        value: 'growth_mindset',
        weights: { resilient: 3, adaptive: 2, positive: 2 }
      },
      {
        label: '🤝 Je demande des conseils pour éviter ça à l\'avenir',
        value: 'collaborative_learner', 
        weights: { social: 3, methodical: 2, humble: 2 }
      },
      {
        label: '🧠 J\'analyse systématiquement ce qui a foiré',
        value: 'analytical_post_mortem',
        weights: { analytical: 3, systematic: 2, perfectionist: 1 }
      }
    ]
  },

  {
    key: 'learning_plateau',
    title: '📈 Après quelques mois, tu stagnes un peu. Comment tu rebondis ?',
    description: '',
    type: 'single',
    options: [
      {
        label: '🚀 Je me lance un défi plus gros pour me motiver',
        value: 'challenge_escalator',
        weights: { ambitious: 3, practical: 2, risk_taker: 2 }
      },
      {
        label: '📖 Je retourne aux fondamentaux pour consolider',
        value: 'foundation_strengthener',
        weights: { systematic: 3, methodical: 2, perfectionist: 2 }
      },
      {
        label: '🌟 J\'explore une nouvelle technologie pour me renouveler',
        value: 'technology_explorer',
        weights: { innovative: 3, adaptive: 2, curious: 3 }
      },
      {
        label: '👥 Je rejoins une communauté/équipe pour apprendre des autres',
        value: 'community_joiner',
        weights: { social: 3, collaborative: 2, humble: 2 }
      },
      {
        label: '🔄 Je fais une pause et reviens plus tard avec un œil neuf',
        value: 'strategic_breaker',
        weights: { reflective: 3, balanced: 2, self_aware: 2 }
      }
    ]
  }
];

// =============================================
// SYSTÈME DE SCORING AMÉLIORÉ
// =============================================

const improvedScoringSystem = {
  // Nouvelles dimensions de personnalité
  personality_dimensions: {
    // Style d'apprentissage principal
    learning_style: ['visual', 'analytical', 'practical', 'social', 'intuitive'],
    
    // Approche des problèmes  
    problem_approach: ['systematic', 'experimental', 'collaborative', 'independent'],
    
    // Motivation principale
    motivation_type: ['impact_driven', 'freedom_seeking', 'intellectually_curious', 'creatively_expressive', 'socially_connected'],
    
    // Gestion du stress/échec
    resilience_style: ['persistent_fighter', 'strategic_thinker', 'collaborative_solver', 'adaptive_learner'],
    
    // Préférence technique
    tech_affinity: ['frontend', 'backend', 'fullstack', 'data_science', 'ai_ml', 'mobile', 'gamedev', 'security']
  },
  
  // Algorithme de mapping vers les profils Lurnix
  profile_mapping: {
    'VISUAL_LEARNER': {
      primary: ['visual', 'creative'],
      secondary: ['systematic', 'perfectionist'],
      tech_preference: ['frontend', 'gamedev', 'mobile']
    },
    'PRACTICAL_BUILDER': {
      primary: ['practical', 'experimental'],
      secondary: ['efficient', 'ambitious'], 
      tech_preference: ['fullstack', 'mobile', 'backend']
    },
    'ANALYTICAL_THINKER': {
      primary: ['analytical', 'systematic'],
      secondary: ['perfectionist', 'independent'],
      tech_preference: ['backend', 'data_science', 'ai_ml', 'security']
    },
    'SOCIAL_COLLABORATOR': {
      primary: ['social', 'collaborative'],
      secondary: ['altruist', 'adaptive'],
      tech_preference: ['frontend', 'fullstack']
    },
    'CREATIVE_EXPLORER': {
      primary: ['creative', 'innovative'],
      secondary: ['experimental', 'curious'],
      tech_preference: ['frontend', 'gamedev', 'ai_ml']
    },
    'STRUCTURED_PLANNER': {
      primary: ['systematic', 'methodical'],
      secondary: ['perfectionist', 'analytical'],
      tech_preference: ['backend', 'data_science', 'security']
    },
    'INDEPENDENT_RESEARCHER': {
      primary: ['independent', 'analytical'],
      secondary: ['persistent', 'methodical'],
      tech_preference: ['backend', 'ai_ml', 'security']
    },
    'GOAL_ORIENTED_ACHIEVER': {
      primary: ['ambitious', 'practical'],
      secondary: ['efficient', 'persistent'],
      tech_preference: ['fullstack', 'mobile', 'backend']
    }
  }
};

export {
  improvedSections,
  section1ImprovedQuestions,
  section2ImprovedQuestions, 
  section3ImprovedQuestions,
  section4ImprovedQuestions,
  improvedScoringSystem,
  currentQuizIssues
};