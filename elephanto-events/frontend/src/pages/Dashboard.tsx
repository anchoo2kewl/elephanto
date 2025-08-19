import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { CountdownTimer } from '@/components/CountdownTimer';
import { GoogleMap } from '@/components/GoogleMap';
import { CocktailDialog } from '@/components/CocktailDialog';
import { SurveyDialog, SurveyData } from '@/components/SurveyDialog';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { cocktailApi } from '@/services/cocktailApi';
import { surveyApi } from '@/services/surveyApi';
import { eventApi, EventWithDetails, EventDetail, EventFAQ } from '@/services/eventApi';
import { Ticket, Wine, FileText, Clock } from 'lucide-react';

// Helper function for FAQ gradients
const getGradientClasses = (colorGradient: string | null | undefined, index: number): string => {
  const gradientMap: { [key: string]: string } = {
    'yellow-orange': 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200/50 dark:border-yellow-800/30',
    'purple-pink': 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200/50 dark:border-purple-800/30',
    'blue-cyan': 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200/50 dark:border-blue-800/30',
    'green-emerald': 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-800/30',
    'indigo-purple': 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200/50 dark:border-indigo-800/30',
    'pink-rose': 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-200/50 dark:border-pink-800/30',
    'amber-yellow': 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200/50 dark:border-amber-800/30',
    'teal-cyan': 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200/50 dark:border-teal-800/30',
  };

  if (colorGradient && gradientMap[colorGradient]) {
    return gradientMap[colorGradient];
  }

  // Fallback to default gradients by index
  const defaultGradients = [
    'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200/50 dark:border-yellow-800/30',
    'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200/50 dark:border-purple-800/30',
    'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200/50 dark:border-blue-800/30',
    'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-800/30',
    'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200/50 dark:border-indigo-800/30',
    'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-200/50 dark:border-pink-800/30',
    'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200/50 dark:border-amber-800/30',
    'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200/50 dark:border-teal-800/30',
  ];
  return defaultGradients[index % defaultGradients.length];
};

// Helper function to get question text color based on gradient
const getQuestionTextColor = (colorGradient: string | null | undefined, index: number): string => {
  const colorMap: { [key: string]: string } = {
    'yellow-orange': 'text-yellow-700 dark:text-yellow-400',
    'purple-pink': 'text-purple-700 dark:text-purple-400',
    'blue-cyan': 'text-blue-700 dark:text-blue-400',
    'green-emerald': 'text-green-700 dark:text-green-400',
    'indigo-purple': 'text-indigo-700 dark:text-indigo-400',
    'pink-rose': 'text-pink-700 dark:text-pink-400',
    'amber-yellow': 'text-amber-700 dark:text-amber-400',
    'teal-cyan': 'text-teal-700 dark:text-teal-400',
  };

  if (colorGradient && colorMap[colorGradient]) {
    return colorMap[colorGradient];
  }

  // Fallback colors by index
  const defaultColors = [
    'text-yellow-700 dark:text-yellow-400',
    'text-purple-700 dark:text-purple-400',
    'text-blue-700 dark:text-blue-400',
    'text-green-700 dark:text-green-400',
    'text-indigo-700 dark:text-indigo-400',
    'text-pink-700 dark:text-pink-400',
    'text-amber-700 dark:text-amber-400',
    'text-teal-700 dark:text-teal-400',
  ];
  return defaultColors[index % defaultColors.length];
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isCocktailDialogOpen, setIsCocktailDialogOpen] = useState(false);
  const [currentPreference, setCurrentPreference] = useState<string>('');
  const [isSurveyDialogOpen, setIsSurveyDialogOpen] = useState(false);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [hasSurveyResponse, setHasSurveyResponse] = useState<boolean>(false);
  const [eventData, setEventData] = useState<EventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load active event data
        const eventResponse = await eventApi.getActiveEvent();
        setEventData(eventResponse.data);

        // Load cocktail preference
        const cocktailResponse = await cocktailApi.getPreference();
        if (cocktailResponse.data) {
          setCurrentPreference(cocktailResponse.data.preference);
        }

        // Load survey response
        const surveyResponse = await surveyApi.getSurveyResponse();
        if (surveyResponse.data) {
          setSurveyData(surveyResponse.data);
          setHasSurveyResponse(true);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        showToast('Failed to load event data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []); // Remove showToast from dependencies to prevent infinite loop

  const handleAction = (action: string) => {
    switch (action) {
      case 'tickets':
        // Redirect to ticket URL from event data
        if (event.ticketUrl) {
          window.open(event.ticketUrl, '_blank');
        } else {
          showToast('Ticket URL not available', 'warning');
        }
        break;
      case 'cocktail':
        // Open cocktail selection dialog (only if enabled)
        if (event.cocktailSelectionEnabled) {
          setIsCocktailDialogOpen(true);
        } else {
          showToast('Cocktail selection is not available for this event', 'info');
        }
        break;
      case 'survey':
        // Open survey/about me (only if enabled)
        if (event.surveyEnabled) {
          setIsSurveyDialogOpen(true);
        } else {
          showToast('Survey is not available for this event', 'info');
        }
        break;
      case 'event':
        // The Hour functionality (only active if enabled)
        if (event.theHourEnabled) {
          if (event.theHourLink) {
            // Open the provided link
            window.open(event.theHourLink, '_blank');
          } else {
            showToast('The Hour will be active on event day!', 'info');
          }
        } else {
          showToast('The Hour is not available for this event', 'info');
        }
        break;
      default:
        break;
    }
  };

  const handleCocktailSave = async (preference: string) => {
    try {
      const response = await cocktailApi.savePreference(preference);
      setCurrentPreference(response.data.preference);
      showToast('Cocktail preference saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save cocktail preference:', error);
      showToast('Failed to save preference. Please try again.', 'error');
    }
  };

  const handleSurveySubmit = async (data: SurveyData) => {
    try {
      const response = await surveyApi.createSurveyResponse(data);
      setSurveyData(response.data);
      setHasSurveyResponse(true);
      setIsSurveyDialogOpen(false);
      showToast('Survey submitted successfully! Thank you for your responses.', 'success', 7000);
    } catch (error: any) {
      console.error('Failed to submit survey:', error);
      if (error.response?.status === 409) {
        showToast('Survey already completed - responses cannot be modified.', 'warning');
      } else {
        showToast('Failed to submit survey. Please try again.', 'error');
      }
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Show error state if no event data
  if (!eventData) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">No Active Event</h2>
        <p className="text-gray-600 dark:text-gray-400">There is currently no active event. Please check back later.</p>
      </div>
    );
  }

  const { event, details, faqs } = eventData;

  const stats = [
    // Always show tickets if URL is available
    ...(event.ticketUrl ? [{ 
      label: 'Tickets', 
      value: 'Buy Now', 
      icon: Ticket, 
      action: 'tickets' as const
    }] : []),
    
    // Show cocktail selection if enabled
    ...(event.cocktailSelectionEnabled ? [{ 
      label: 'Cocktail', 
      value: currentPreference ? 'Selected' : 'Select', 
      icon: Wine, 
      action: 'cocktail' as const
    }] : []),
    
    // Show survey if enabled
    ...(event.surveyEnabled ? [{ 
      label: 'About Me', 
      value: hasSurveyResponse ? 'Completed' : 'Survey', 
      icon: FileText, 
      action: 'survey' as const
    }] : []),
    
    // Show The Hour if enabled
    ...(event.theHourEnabled ? [{ 
      label: 'The Hour', 
      value: event.theHourLink ? 'Enter' : 'Coming Soon', 
      icon: Clock, 
      action: 'event' as const,
      disabled: !event.theHourLink
    }] : []),
  ];

  return (
    <div className="space-y-3 sm:space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <GlassCard variant="elevated" className="p-3 sm:p-6">
        <div className="text-center space-y-4">
          <div className="flex flex-col items-center">
            <h1 className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {user?.name || 'Friend'}! 👋
            </h1>
            <p className="text-xs sm:text-base text-gray-700 dark:text-gray-300 mb-4">
              Get ready for {event.title} - {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
            </p>
          </div>
          
          {/* Countdown Timer - only show if enabled */}
          {event.countdownEnabled && (
            <div className="bg-black/20 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Event Countdown</h2>
              <CountdownTimer targetDate={event.date} />
            </div>
          )}
        </div>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, action, disabled }) => (
          <GlassCard 
            key={label} 
            className={`p-2 sm:p-4 text-center transition-all duration-200 ${
              disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer hover:scale-105 hover:shadow-lg'
            }`}
            onClick={() => !disabled && handleAction(action)}
          >
            <Icon className="h-5 w-5 sm:h-8 sm:w-8 text-yellow-500 mx-auto mb-1 sm:mb-2" />
            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Dynamic Event Sections */}
      {details && details.length > 0 && details
        .sort((a: EventDetail, b: EventDetail) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map((detail: EventDetail) => (
          <GlassCard key={detail.id} variant="elevated" className="p-6 sm:p-8">
            {detail.title && (
              <div className="text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  {detail.title}
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mx-auto"></div>
              </div>
            )}
            
            {detail.content && (
              <div 
                className="event-detail-content prose prose-lg max-w-none prose-gray dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300"
                dangerouslySetInnerHTML={{ __html: detail.content }}
              />
            )}
            
            {/* Show Google Map for location section if enabled */}
            {detail.sectionType === 'location' && event.googleMapsEnabled && event.address && (
              <div className="mt-6">
                <GoogleMap address={event.address} className="w-full" />
              </div>
            )}
          </GlassCard>
        ))}
      
      {/* Fallback if no event details exist */}
      {(!details || details.length === 0) && (
        <GlassCard variant="elevated" className="p-6 sm:p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Event Details Coming Soon
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              More information about this event will be available soon.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Dynamic FAQs */}
      {faqs && faqs.length > 0 && (
        <GlassCard className="p-6 sm:p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h3>
            <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs
              .sort((a: EventFAQ, b: EventFAQ) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((faq: EventFAQ, index: number) => (
                <div 
                  key={faq.id} 
                  className={`p-4 rounded-lg border bg-gradient-to-r ${getGradientClasses(faq.colorGradient, index)}`}
                >
                  <p className={`font-bold mb-2 ${getQuestionTextColor(faq.colorGradient, index)}`} 
                     dangerouslySetInnerHTML={{ __html: faq.question }} />
                  <p className="text-gray-700 dark:text-gray-300" 
                     dangerouslySetInnerHTML={{ __html: faq.answer }} />
                </div>
              ))}
          </div>
        </GlassCard>
      )}

      {/* Default Contact Section - only show if no contact section in event details */}
      {(!details || !details.some((d: EventDetail) => d.sectionType === 'contact')) && (
        <GlassCard className="p-6 sm:p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Stay Connected
            </h3>
            <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Follow us for updates, behind-the-scenes content, and exclusive announcements
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <button 
              onClick={() => window.open('https://www.instagram.com/elephantoevents/', '_blank')}
              className="group flex items-center space-x-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-3 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <span className="text-xl">📷</span>
              <span className="font-medium">Instagram</span>
              <span className="text-sm opacity-80">@elephantoevents</span>
            </button>
            
            <button 
              onClick={() => window.open('mailto:info@elephantoevents.ca', '_blank')}
              className="group flex items-center space-x-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <span className="text-xl">✉️</span>
              <span className="font-medium">Email</span>
              <span className="text-sm opacity-80">Get in touch</span>
            </button>
          </div>
          
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
                <span className="text-xl">🌟</span>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">Contact Information</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Have questions? We're here to help!
              </p>
              <div className="space-y-2">
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  📧 info@elephantoevents.ca
                </p>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  📱 @elephantoevents
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Cocktail Dialog */}
      <CocktailDialog
        isOpen={isCocktailDialogOpen}
        onClose={() => setIsCocktailDialogOpen(false)}
        onSave={handleCocktailSave}
        currentPreference={currentPreference}
      />

      {/* Survey Dialog */}
      <SurveyDialog
        isOpen={isSurveyDialogOpen}
        onClose={() => setIsSurveyDialogOpen(false)}
        onSubmit={handleSurveySubmit}
        userEmail={user?.email || ''}
        userFullName={user?.name || ''}
        isReadOnly={hasSurveyResponse}
        existingData={surveyData || undefined}
      />
    </div>
  );
};