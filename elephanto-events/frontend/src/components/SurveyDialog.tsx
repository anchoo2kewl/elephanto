import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SurveyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SurveyData) => void;
  userEmail: string;
  userFullName: string;
  isReadOnly?: boolean;
  existingData?: SurveyData;
}

export interface SurveyData {
  fullName: string;
  email: string;
  age: number | '';
  gender: string;
  torontoMeaning: string;
  personality: string;
  connectionType: string;
  instagramHandle?: string;
  howHeardAboutUs: string;
}

const torontoMeaningOptions = [
  { value: 'new_beginning', label: 'A new beginning — a fresh start or transition in life' },
  { value: 'temporary_stop', label: 'A temporary stop — just a chapter in my journey' },
  { value: 'place_to_visit', label: 'A place to visit — a destination I enjoy or want to explore' },
  { value: 'land_of_opportunity', label: 'A land of opportunity — a place to build wealth or career success' },
  { value: 'home', label: 'Home — where I live, belong, and feel rooted' },
];

const personalityOptions = [
  { value: 'Ambitious', label: 'Ambitious – You\'re highly driven and have a go-getter attitude.' },
  { value: 'Adventurous', label: 'Adventurous - You like to travel and try out new places/things' },
  { value: 'Balanced', label: 'Balanced – You strive for a healthy mix of productivity and personal well-being.' },
  { value: 'Intentional', label: 'Intentional – You prefer a quieter, more mindful approach to daily life.' },
  { value: 'Social', label: 'Social – You enjoy being around people and thrive on social energy.' },
];

const connectionTypeOptions = [
  { value: 'Dating', label: 'Dating' },
  { value: 'Friendship', label: 'Friendship/ meet new people' },
  { value: 'Professional', label: 'Professional Connection' },
];

const howHeardOptions = [
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Event Brite', label: 'Event Brite' },
  { value: 'Friends/Family', label: 'Friends/ Family' },
  { value: 'Facebook', label: 'Facebook' },
];

export const SurveyDialog: React.FC<SurveyDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userEmail,
  userFullName,
  isReadOnly = false,
  existingData,
}) => {
  const [formData, setFormData] = useState<SurveyData>({
    fullName: userFullName,
    email: userEmail,
    age: '',
    gender: '',
    torontoMeaning: '',
    personality: '',
    connectionType: '',
    instagramHandle: '',
    howHeardAboutUs: '',
  });

  // Update form data when existingData changes
  useEffect(() => {
    if (existingData) {
      setFormData({
        fullName: existingData.fullName || userFullName,
        email: existingData.email || userEmail,
        age: existingData.age || '',
        gender: existingData.gender || '',
        torontoMeaning: existingData.torontoMeaning || '',
        personality: existingData.personality || '',
        connectionType: existingData.connectionType || '',
        instagramHandle: existingData.instagramHandle || '',
        howHeardAboutUs: existingData.howHeardAboutUs || '',
      });
    } else if (!isReadOnly) {
      // Reset form for new submissions
      setFormData({
        fullName: userFullName,
        email: userEmail,
        age: '',
        gender: '',
        torontoMeaning: '',
        personality: '',
        connectionType: '',
        instagramHandle: '',
        howHeardAboutUs: '',
      });
    }
  }, [existingData, userEmail, userFullName, isReadOnly]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ['fullName', 'email', 'gender', 'torontoMeaning', 'personality', 'connectionType', 'howHeardAboutUs'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof SurveyData]);
    
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    if (!formData.age || formData.age < 18 || formData.age > 100) {
      alert('Age must be between 18 and 100');
      return;
    }

    onSubmit(formData);
  };

  const handleChange = (field: keyof SurveyData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Velvet Hour Survey
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <strong>Event:</strong> September 17, 2025 | 6:30 PM - 9:30 PM<br />
                <strong>Location:</strong> Mademoiselle Raw Bar + Grill, 563 King St W, Toronto
              </p>
              {isReadOnly && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 font-medium">
                  Survey already completed - viewing your responses
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              disabled={isReadOnly}
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-800 dark:text-white disabled:opacity-50"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              required
              disabled={isReadOnly}
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-800 dark:text-white disabled:opacity-50"
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Age *
            </label>
            <input
              type="number"
              required
              min="18"
              max="100"
              disabled={isReadOnly}
              value={formData.age}
              onChange={(e) => handleChange('age', e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-800 dark:text-white disabled:opacity-50"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Gender *
            </label>
            <div className="space-y-2">
              {['Male', 'Female', 'Other'].map((option) => (
                <label key={option} className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      disabled={isReadOnly}
                      checked={formData.gender === option}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                      formData.gender === option 
                        ? 'border-yellow-500 bg-yellow-500' 
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      {formData.gender === option && (
                        <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Toronto Meaning */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              What does Toronto mean to you *
            </label>
            <div className="space-y-2">
              {torontoMeaningOptions.map((option) => (
                <label key={option.value} className="flex items-start cursor-pointer">
                  <div className="relative mt-1">
                    <input
                      type="radio"
                      name="torontoMeaning"
                      value={option.value}
                      disabled={isReadOnly}
                      checked={formData.torontoMeaning === option.value}
                      onChange={(e) => handleChange('torontoMeaning', e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                      formData.torontoMeaning === option.value 
                        ? 'border-yellow-500 bg-yellow-500' 
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      {formData.torontoMeaning === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Personality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Which of the following best describe you? *
            </label>
            <div className="space-y-2">
              {personalityOptions.map((option) => (
                <label key={option.value} className="flex items-start cursor-pointer">
                  <div className="relative mt-1">
                    <input
                      type="radio"
                      name="personality"
                      value={option.value}
                      disabled={isReadOnly}
                      checked={formData.personality === option.value}
                      onChange={(e) => handleChange('personality', e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                      formData.personality === option.value 
                        ? 'border-yellow-500 bg-yellow-500' 
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      {formData.personality === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Connection Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              What type of connections are you looking to make at the event? *
            </label>
            <div className="space-y-2">
              {connectionTypeOptions.map((option) => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="radio"
                      name="connectionType"
                      value={option.value}
                      disabled={isReadOnly}
                      checked={formData.connectionType === option.value}
                      onChange={(e) => handleChange('connectionType', e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                      formData.connectionType === option.value 
                        ? 'border-yellow-500 bg-yellow-500' 
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      {formData.connectionType === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Instagram Handle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Instagram Handle *
            </label>
            <input
              type="text"
              placeholder="@yourusername"
              disabled={isReadOnly}
              value={formData.instagramHandle || ''}
              onChange={(e) => handleChange('instagramHandle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-800 dark:text-white disabled:opacity-50"
            />
          </div>

          {/* How Heard About Us */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              How did you hear about us? *
            </label>
            <div className="space-y-2">
              {howHeardOptions.map((option) => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="radio"
                      name="howHeardAboutUs"
                      value={option.value}
                      disabled={isReadOnly}
                      checked={formData.howHeardAboutUs === option.value}
                      onChange={(e) => handleChange('howHeardAboutUs', e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                      formData.howHeardAboutUs === option.value 
                        ? 'border-yellow-500 bg-yellow-500' 
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      {formData.howHeardAboutUs === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
              >
                Submit Survey
              </button>
            )}
          </div>

          {!isReadOnly && (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Thank you for filling up the form. We look forward to meeting you at the Velvet Hour.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};