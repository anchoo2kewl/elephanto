// Shared survey form constants and options

export const SURVEY_OPTIONS = {
  torontoMeaning: [
    { value: 'new_beginning', label: 'A new beginning — a fresh start or transition in life' },
    { value: 'temporary_stop', label: 'A temporary stop — just a chapter in my journey' },
    { value: 'place_to_visit', label: 'A place to visit — a destination I enjoy or want to explore' },
    { value: 'land_of_opportunity', label: 'A land of opportunity — a place to build wealth or career success' },
    { value: 'home', label: 'Home — where I live, belong, and feel rooted' },
  ],

  personality: [
    { value: 'Ambitious', label: 'Ambitious – You\'re highly driven and have a go-getter attitude.' },
    { value: 'Adventurous', label: 'Adventurous - You like to travel and try out new places/things' },
    { value: 'Balanced', label: 'Balanced – You strive for a healthy mix of productivity and personal well-being.' },
    { value: 'Intentional', label: 'Intentional – You prefer a quieter, more mindful approach to daily life.' },
    { value: 'Social', label: 'Social – You enjoy being around people and thrive on social energy.' },
  ],

  connectionType: [
    { value: 'Dating', label: 'Dating' },
    { value: 'Friendship', label: 'Friendship/ meet new people' },
    { value: 'Professional', label: 'Professional Connection' },
  ],

  howHeardAboutUs: [
    { value: 'Instagram', label: 'Instagram' },
    { value: 'Event Brite', label: 'Event Brite' },
    { value: 'Friends/Family', label: 'Friends/ Family' },
    { value: 'Facebook', label: 'Facebook' },
  ]
};

export const COCKTAIL_OPTIONS = [
  { value: 'beer', label: 'Beer', emoji: '🍺', description: 'Refreshing beers and lagers' },
  { value: 'wine', label: 'Wine', emoji: '🍷', description: 'Fine wines and champagne' },
  { value: 'cocktail', label: 'Cocktail', emoji: '🍸', description: 'Premium cocktails and spirits' },
  { value: 'non-alcoholic', label: 'Non-Alcoholic', emoji: '🥤', description: 'Mocktails and soft drinks' },
];

export const SURVEY_LABELS = {
  fullName: 'Full Name',
  email: 'Email Address',
  age: 'Age',
  gender: 'Gender',
  torontoMeaning: 'What does Toronto mean to you?',
  personality: 'Which of these personality types best describes you?',
  connectionType: 'What type of connection are you looking for at this event?',
  instagramHandle: 'Instagram Handle (Optional)',
  howHeardAboutUs: 'How did you hear about this event?'
};

export const COCKTAIL_LABELS = {
  preference: 'What type of drink do you prefer?'
};