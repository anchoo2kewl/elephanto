import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { CountdownTimer } from '@/components/CountdownTimer';
import { GoogleMap } from '@/components/GoogleMap';
import { OpenStreetMap } from '@/components/OpenStreetMap';
import { CocktailDialog } from '@/components/CocktailDialog';
import { SurveyDialog, SurveyData } from '@/components/SurveyDialog';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { cocktailApi } from '@/services/cocktailApi';
import { surveyApi } from '@/services/surveyApi';
import { eventApi, EventWithDetails, EventDetail, EventFAQ } from '@/services/eventApi';
import { velvetHourApi } from '@/services/velvetHourApi';
import { VelvetHourStatusResponse } from '@/types/velvet-hour';
import { Ticket, Wine, FileText, Clock } from 'lucide-react';


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
  const [_velvetHourStatus, setVelvetHourStatus] = useState<VelvetHourStatusResponse | null>(null);

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

        // Load Velvet Hour status if enabled
        if (eventResponse.data.event.theHourEnabled) {
          try {
            const velvetHourResponse = await velvetHourApi.getStatus();
            setVelvetHourStatus(velvetHourResponse.data);
          } catch (error) {
            // Velvet Hour might not be started yet, that's fine
            console.log('Velvet Hour not started yet');
          }
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
      case 'velvet-hour':
        // The Velvet Hour functionality
        if (event.theHourEnabled && event.theHourAvailable) {
          // Navigate to Velvet Hour page - let the Velvet Hour page handle session checks
          window.location.href = '/velvet-hour';
        } else {
          showToast('The Velvet Hour is coming soon!', 'info');
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
      label: 'The Velvet Hour', 
      value: event.theHourAvailable ? 'Enter' : 'Coming Soon',
      icon: Clock, 
      action: 'velvet-hour' as const,
      disabled: !event.theHourAvailable
    }] : []),
  ];

  const firstName = (user?.name?.trim().split(/\s+/)[0]) || "Friend";

  return (
    <div className="space-y-3 sm:space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <GlassCard variant="elevated" className="p-3 sm:p-6">
        <div className="text-center space-y-6">
          <div className="flex flex-col items-center">
            <h1 className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome back, {firstName}!
            </h1>
            <div className="text-center mb-6">
              <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400 mb-2">
                Get ready for
              </p>
              <h2 className="text-xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-3">
                {event.title}
              </h2>
              <div className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-xl p-4 border border-yellow-400/30">
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {new Date(event.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                  6:30 PM ET
                </p>
              </div>
            </div>
          </div>
          
          {/* Countdown Timer - only show if enabled */}
          {event.countdownEnabled && (
            <div className="bg-black/20 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Event Countdown</h2>
              <CountdownTimer targetDate={event.date.split('T')[0]} />
            </div>
          )}
        </div>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {stats.map((stat) => {
          const { label, value, icon: Icon, action, disabled } = stat;
          const loading = false; // Default to false for now
          return (
          <GlassCard 
            key={label} 
            className={`p-2 sm:p-4 text-center transition-all duration-200 ${
              disabled || loading
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer hover:scale-105 hover:shadow-lg'
            }`}
            onClick={() => !disabled && !loading && handleAction(action)}
          >
            {loading ? (
              <div className="h-5 w-5 sm:h-8 sm:w-8 mx-auto mb-1 sm:mb-2 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent"></div>
            ) : (
              <Icon className="h-5 w-5 sm:h-8 sm:w-8 text-yellow-500 mx-auto mb-1 sm:mb-2" />
            )}
            <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{label}</div>
          </GlassCard>
          );
        })}
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
            
            {/* Show Map for location section if enabled */}
            {detail.sectionType === 'location' && event.googleMapsEnabled && event.address && (
              <div className="mt-6">
                {event.mapProvider === 'openstreetmap' ? (
                  <OpenStreetMap address={event.address} className="w-full" />
                ) : (
                  <GoogleMap address={event.address} className="w-full" />
                )}
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs
              .sort((a: EventFAQ, b: EventFAQ) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((faq: EventFAQ) => (
                <div 
                  key={faq.id} 
                  className="bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg"
                >
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-3" 
                     dangerouslySetInnerHTML={{ __html: faq.question }} />
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed" 
                     dangerouslySetInnerHTML={{ __html: faq.answer }} />
                </div>
              ))}
          </div>
        </GlassCard>
      )}

      {/* Default Contact Section - only show if no contact section in event details */}
      {(!details || !details.some((d: EventDetail) => d.sectionType === 'contact')) && (
        <GlassCard className="p-6 sm:p-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Stay Connected
            </h3>
            <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mx-auto mb-6"></div>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto text-lg">
              Follow us for updates, behind-the-scenes content, and exclusive announcements
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8">
            <button 
              onClick={() => window.open('https://www.instagram.com/elephantoevents/', '_blank')}
              className="group flex flex-col items-center p-8 bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-pink-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 min-w-[200px]"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Instagram</h4>
              <p className="text-gray-600 dark:text-gray-400 text-center">@elephantoevents</p>
            </button>
            
            <button 
              onClick={() => window.open('mailto:info@elephantoevents.ca', '_blank')}
              className="group flex flex-col items-center p-8 bg-white/5 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 min-w-[200px]"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Email</h4>
              <p className="text-gray-600 dark:text-gray-400 text-center">info@elephantoevents.ca</p>
            </button>
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
