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
import { Ticket, Wine, FileText, Clock } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isCocktailDialogOpen, setIsCocktailDialogOpen] = useState(false);
  const [currentPreference, setCurrentPreference] = useState<string>('');
  const [isSurveyDialogOpen, setIsSurveyDialogOpen] = useState(false);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [hasSurveyResponse, setHasSurveyResponse] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      try {
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
      }
    };

    loadData();
  }, []);

  const handleAction = (action: string) => {
    switch (action) {
      case 'tickets':
        // Redirect to Eventbrite
        window.open('https://www.eventbrite.com/e/velvet-hour-exclusive-south-asian-social-mixer-tickets-1462437553089', '_blank');
        break;
      case 'cocktail':
        // Open cocktail selection dialog
        setIsCocktailDialogOpen(true);
        break;
      case 'survey':
        // Open survey/about me
        setIsSurveyDialogOpen(true);
        break;
      case 'event':
        // The Hour functionality (only active on event day)
        showToast('The Hour will be active on event day!', 'info');
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

  const mainEvent = {
    title: 'Velvet Hour',
    date: '2025-09-17',
    time: '6:30 - 9:30 PM',
    entry: 'Entry until 7:15 PM',
    location: 'Mademoiselle Bar + Grill, Toronto',
    address: '563 King St W, Toronto, ON M5V 1M1',
    attire: 'Smart Casual',
    age: '25 - 40',
    description: 'An exclusive evening of networking, cocktails, and connection in the heart of Toronto.',
  };

  const stats = [
    { label: 'Tickets', value: 'Buy Now', icon: Ticket, action: 'tickets' },
    { label: 'Cocktail', value: 'Select', icon: Wine, action: 'cocktail' },
    { label: 'About Me', value: hasSurveyResponse ? 'Completed' : 'Survey', icon: FileText, action: 'survey' },
    { label: 'The Hour', value: 'Coming Soon', icon: Clock, action: 'event', disabled: true },
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
              Get ready for Velvet Hour - Saturday, September 17th, 2025
            </p>
          </div>
          
          {/* Countdown Timer */}
          <div className="bg-black/20 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Event Countdown</h2>
            <CountdownTimer targetDate="2025-09-17" />
          </div>
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

      {/* About the Event */}
      <GlassCard variant="elevated" className="p-6 sm:p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            About the Event
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mx-auto"></div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-4">
            Velvet Hour: Where Connection Meets Intention
          </h3>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
            An exclusive South Asian social mixer crafted for those who seek connection with depth and purpose. 
            Set in the luxurious and intimate setting of Mademoiselle in Toronto, this premium evening invites 
            accomplished professionals, entrepreneurs, creatives, and visionaries from across the GTA.
          </p>
        </div>

        {/* Key Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassCard className="p-6 text-center bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
            <div className="text-3xl mb-3">🥂</div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-2">Premium Experience</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ambient lounge vibes, variety of drinks, and passed hors d'oeuvres</p>
          </GlassCard>
          
          <GlassCard className="p-6 text-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <div className="text-3xl mb-3">🤝</div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-2">Meaningful Connections</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Curated guest list designed to spark authentic conversations</p>
          </GlassCard>
          
          <GlassCard className="p-6 text-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
            <div className="text-3xl mb-3">🎯</div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-2">Intentional Community</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Where ambition, culture, and community come together</p>
          </GlassCard>
        </div>

        {/* Event Details */}
        <GlassCard variant="subtle" className="p-6 mb-8">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">Event Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm sm:text-base">
            <div className="flex items-center text-gray-800 dark:text-gray-300">
              <span className="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">📅 Date:</span>
              Saturday, September 17th, 2025
            </div>
            <div className="flex items-center text-gray-800 dark:text-gray-300">
              <span className="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">⏰ Time:</span>
              6:30 - 9:30 PM
            </div>
            <div className="flex items-center text-gray-800 dark:text-gray-300">
              <span className="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">🚪 Entry:</span>
              Entry until 7:15 PM
            </div>
            <div className="flex items-center text-gray-800 dark:text-gray-300">
              <span className="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">📍 Location:</span>
              Mademoiselle Bar + Grill
            </div>
            <div className="flex items-center text-gray-800 dark:text-gray-300">
              <span className="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">👔 Attire:</span>
              Smart Casual
            </div>
            <div className="flex items-center text-gray-800 dark:text-gray-300">
              <span className="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">🎂 Age:</span>
              25 - 40
            </div>
          </div>
        </GlassCard>

        {/* Who We're Looking For */}
        <GlassCard variant="subtle" className="p-6 mb-8">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Who We're Curating</h4>
          <p className="text-gray-700 dark:text-gray-300 text-center mb-6">
            We are curating a refined and intentional group of South Asians who are:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
              </div>
              <span className="text-gray-700 dark:text-gray-300">Ambitious and professionally established</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
              </div>
              <span className="text-gray-700 dark:text-gray-300">Culturally rooted in the South Asian community</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
              </div>
              <span className="text-gray-700 dark:text-gray-300">Age range: 25 - 40 years old</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
              </div>
              <span className="text-gray-700 dark:text-gray-300">Open to meaningful conversations and lasting connections</span>
            </div>
          </div>
        </GlassCard>

        {/* Guidelines */}
        <GlassCard variant="subtle" className="p-6 mb-8 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Important Guidelines</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">💼</div>
              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Dress Code</h5>
              <p className="text-gray-700 dark:text-gray-300">Smart Casual — come dressed to impress</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">⏳</div>
              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Timely Arrival</h5>
              <p className="text-gray-700 dark:text-gray-300">Entry permitted only up to 30 minutes after start time</p>
            </div>
          </div>
        </GlassCard>

        {/* About ElephanTO */}
        <GlassCard variant="subtle" className="p-6 mb-8">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">About ElephanTO Events</h4>
          <p className="text-gray-700 dark:text-gray-300 text-center leading-relaxed">
            ElephanTO Events was started to fill a gap in the South Asian social scene by creating spaces that 
            celebrate culture and bring people together. Our events are designed to help you grow, connect, 
            and collaborate in a welcoming and meaningful way.
          </p>
        </GlassCard>

        {/* Location & Map */}
        <GlassCard variant="subtle" className="p-6">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Venue Location</h4>
          <p className="text-gray-700 dark:text-gray-400 mb-3 text-center font-semibold">
            📍 Mademoiselle Bar + Grill, Toronto
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center text-sm">
            563 King St W, Toronto, ON M5V 1M1
          </p>
          <GoogleMap address="563 King St W, Toronto, ON M5V 1M1" className="w-full" />
        </GlassCard>
      </GlassCard>

      {/* FAQs */}
      <GlassCard className="p-6 sm:p-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h3>
          <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mx-auto"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200/50 dark:border-yellow-800/30">
              <p className="font-bold text-yellow-700 dark:text-yellow-400 mb-2">What's the dress code?</p>
              <p className="text-gray-700 dark:text-gray-300">Smart-Casual, Dress to Impress :)</p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200/50 dark:border-purple-800/30">
              <p className="font-bold text-purple-700 dark:text-purple-400 mb-2">Can I bring a guest?</p>
              <p className="text-gray-700 dark:text-gray-300">Only individuals with a valid ticket will be able to attend.</p>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/30">
              <p className="font-bold text-blue-700 dark:text-blue-400 mb-2">Will there be food and drinks?</p>
              <p className="text-gray-700 dark:text-gray-300">There will be options of alcoholic/non-alcoholic drinks to choose from, along with passed hors d'oeuvres.</p>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200/50 dark:border-green-800/30">
              <p className="font-bold text-green-700 dark:text-green-400 mb-2">What's the typical age group or audience?</p>
              <p className="text-gray-700 dark:text-gray-300">Between 25-40 years old</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200/50 dark:border-indigo-800/30">
              <p className="font-bold text-indigo-700 dark:text-indigo-400 mb-2">Is there a structured program or is it free-flow?</p>
              <p className="text-gray-700 dark:text-gray-300">The Velvet hour will be a structured program, more details to come!</p>
            </div>
            
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg p-4 border border-pink-200/50 dark:border-pink-800/30">
              <p className="font-bold text-pink-700 dark:text-pink-400 mb-2">Is this a networking or just social event?</p>
              <p className="text-gray-700 dark:text-gray-300">Both! This event gives you the flexibility to network, be social, and most importantly, build connections.</p>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg p-4 border border-amber-200/50 dark:border-amber-800/30">
              <p className="font-bold text-amber-700 dark:text-amber-400 mb-2">Is there a cost to attend?</p>
              <p className="text-gray-700 dark:text-gray-300">Yes there will be a ticket price shared with those on the guest list.</p>
            </div>
            
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-teal-200/50 dark:border-teal-800/30">
              <p className="font-bold text-teal-700 dark:text-teal-400 mb-2">Will there be name tags or icebreakers?</p>
              <p className="text-gray-700 dark:text-gray-300">There will be no nametags required. Yes we will have icebreakers.</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Social Media & Contact */}
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