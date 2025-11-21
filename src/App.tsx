import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ChevronRight, Star, Users, Zap, Target, TrendingUp, Shield, MessageCircle, CheckCircle, XCircle, Clock, BarChart3, Moon, Sun, Menu, X, TrendingDown } from 'lucide-react';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import Dashboard from './components/Dashboard';
import SubmitFiles from './components/SubmitFiles';
import EditCompany from './components/EditCompany';
import FounderSubmission from './components/FounderSubmission';
import VentureDetail from './components/VentureDetail';
import FounderDashboard from './components/FounderDashboard';
import EditPrompts from './components/EditPrompts';
import CompanyList from './components/CompanyList';
import TestFiles from './components/TestFiles';
import InvestorSelection from './components/InvestorSelection';
import InvestorPreferences from './components/InvestorPreferences';
import InvestorPrompts from './components/InvestorPrompts';
import Help from './components/Help';
import Account from './components/Account';
import Features from './components/Features';
import Pricing from './components/Pricing';
import Demo from './components/Demo';
import Privacy from './components/Privacy';
import Terms from './components/Terms';
import Security from './components/Security';
import CompanyInvestorMatch from './components/CompanyInvestorMatch';
import { useNavigate, useLocation } from 'react-router-dom';

function InvestorSelectionWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const companyId = location.state?.companyId;

  if (!companyId) {
    navigate('/founder-dashboard');
    return null;
  }

  return (
    <InvestorSelection
      companyId={companyId}
      onComplete={() => navigate('/founder-dashboard')}
      onCancel={() => navigate('/founder-dashboard')}
    />
  );
}

function HomePage({ isDark, setIsDark, isMobileMenuOpen, setIsMobileMenuOpen }: {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (value: boolean) => void;
}) {
  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const testimonials = [
    {
      quote: "Were able to review 5 times the number of proposals in a comprehensive and unbiased manner",
      author: "Tech Coast Angels"
    },
    {
      quote: "Quickly analyzed companies with which I had little knowledge and ended up investing in one that I would normally have passed on",
      author: "Angel investor"
    },
    {
      quote: "Have gotten greater visibility and are receiving more proposals",
      author: "Pasadena Angels"
    },
    {
      quote: "Were able to provide great feed back for our entrepreneurs",
      author: "Houston Angels"
    }
  ];

  const benefits = [
    {
      icon: <Target className="w-8 h-8 text-blue-600" />,
      title: "Intelligent Matching",
      description: "AI automatically matches founders with investors based on investment criteria, industry focus, and preferences—the platform's \"wow\" factor"
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-600" />,
      title: "4-Category AI Analysis",
      description: "Comprehensive evaluation across Product/Service, Market, Leadership Team, and Financials with detailed subcategories"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-blue-600" />,
      title: "Public Data Integration",
      description: "AI analyzes not just pitch decks, but also websites, LinkedIn profiles, publications, and public information"
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-blue-600" />,
      title: "Comprehensive Scoring",
      description: "Detailed score cards with ratings across all categories plus investment recommendations and Go/No-Go guidance"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-blue-600" />,
      title: "Multiple Report Types",
      description: "Generate scorecards, detailed analysis, diligence questions, and founder feedback reports instantly with professional HTML-to-PDF formatting"
    },
    {
      icon: <Target className="w-8 h-8 text-blue-600" />,
      title: "Custom Analysis Prompts",
      description: "Create personalized analysis prompts for Product, Market, Team, and Financial analysis tailored to your investment approach"
    },
    {
      icon: <Shield className="w-8 h-8 text-blue-600" />,
      title: "Founder Feedback Loop",
      description: "Provide constructive feedback to entrepreneurs automatically, improving deal quality and relationships"
    }
  ];

  const flowSteps = [
    {
      step: "1",
      title: "Founders Submit",
      description: "Entrepreneurs upload pitch decks, financials, patents, market research—platform gathers public data automatically"
    },
    {
      step: "2",
      title: "Intelligent Matching",
      description: "AI matches founders with investors based on investment criteria, industry focus, and preferences—the platform's \"wow\" factor"
    },
    {
      step: "3",
      title: "Automated Screening",
      description: "AI filters proposals against your custom criteria (revenue, industry, geography, stage) before deep analysis"
    },
    {
      step: "4",
      title: "4-Category AI Analysis",
      description: "AI analyzes Product/Service fit, Market dynamics, Leadership Team capabilities, and Financial health with 16 subcategories—all in minutes"
    },
    {
      step: "5",
      title: "Sophisticated Report Generation",
      description: "Generate comprehensive reports in minutes: scorecards, detailed analysis, diligence questions, and founder feedback—all as professional PDFs"
    },
    {
      step: "6",
      title: "Investment Decision",
      description: "Make informed decisions with comprehensive scoring, recommendations, and detailed analysis reports—evaluate 10x deals in 1/10th the time"
    }
  ];

  const faqs = [
    {
      question: "What makes PitchFork unique?",
      answer: "PitchFork's 'wow' factor is intelligent investor-founder matching combined with sophisticated report generation in minutes. The platform automatically matches founders with relevant investors based on investment criteria, then generates comprehensive AI-powered analysis reports covering 16 detailed subcategories across Product/Service, Market, Leadership Team, and Financials—all in minutes, not hours."
    },
    {
      question: "What reports can I generate?",
      answer: "Generate sophisticated reports in minutes: (1) Comprehensive Score Cards with category ratings and detailed breakdowns, (2) Detailed Analysis Reports combining all analysis reports with full details preserved, (3) Diligence Questions for targeted follow-up investigation, and (4) Founder Feedback Reports to share with entrepreneurs. All reports are generated as professional PDFs with high-quality formatting and preserve all details from your analysis reports."
    },
    {
      question: "Can I customize the AI analysis prompts?",
      answer: "Yes! Navigate to Utilities → Investor Prompts to create custom analysis prompts for Product, Market, Team, and Financial analysis. You can type or use voice input to personalize how the AI evaluates ventures based on your specific investment criteria. Custom prompts are clearly marked with an asterisk (*) on the analysis buttons."
    },
    {
      question: "How does automated screening work?",
      answer: "Set your investment criteria (revenue thresholds, industry preferences, geography, funding stage, team size) and proposals are automatically filtered against these parameters before deep AI analysis begins, saving you time on non-matches."
    },
    {
      question: "Can founders receive feedback?",
      answer: "Yes! PitchFork automatically generates constructive feedback reports that you can share with entrepreneurs, helping them improve their pitch while building better relationships with your investment community."
    },
    {
      question: "How secure is our data?",
      answer: "We use enterprise-grade security with end-to-end encryption and strict data privacy controls to protect sensitive investment information and pitch materials."
    }
  ];

  const mockDashboard = [
    { company: "TechStart AI", status: "Analyzing", score: null, recommendation: null },
    { company: "GreenEnergy Co", status: "Invest", score: 8.7, recommendation: "Strong Buy" },
    { company: "RetailTech", status: "Reject", score: 4.2, recommendation: "Pass" },
    { company: "HealthApp", status: "Reject", score: 5.1, recommendation: "Pass" }
  ];

  return (
    <div className={`min-h-screen font-body font-aptos transition-colors duration-300 ${isDark ? 'bg-navy-950 text-silver-100' : 'bg-silver-50 text-slate-900'}`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 ${isDark ? 'bg-navy-900/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDark ? 'border-navy-700' : 'border-silver-200'} shadow-financial`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/pitch-fork3.png" alt="PitchFork Logo" className="w-8 h-8 mr-3" />
              <div className="text-2xl font-bold bg-gold-gradient bg-clip-text text-transparent">
                PitchFork
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <span className="text-blue-600 font-semibold">
                Investors &amp; Founders:
              </span>
              <Link to="/login" className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-all duration-300 shadow-lg font-semibold">
                Login/Sign-Up
              </Link>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDark ? 'bg-navy-800 hover:bg-navy-700' : 'bg-silver-100 hover:bg-silver-200'} transition-colors shadow-sm`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>

            <div className="md:hidden flex items-center space-x-2">
              <button onClick={toggleTheme} className={`p-2 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-silver-100'}`}>
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-lg ${isDark ? 'bg-navy-800' : 'bg-silver-100'}`}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className={`md:hidden ${isDark ? 'bg-navy-900' : 'bg-white'} border-t ${isDark ? 'border-navy-700' : 'border-silver-200'}`}>
            <div className="px-4 py-4 space-y-4">
              <div className="text-center">
                <span className="text-blue-600 font-semibold">
                  Investors &amp; Founders:
                </span>
              </div>
              <Link to="/login" className="w-full bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 block text-center font-semibold">
                Login/Sign-Up
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative flex">
        {/* Left Column - Black Background with Text Content */}
        <div className="w-full lg:w-[60%] bg-black text-white flex items-start pt-8 pb-8 px-4 sm:px-6 lg:px-6">
          <div className="max-w-2xl">
            <p className="text-lg md:text-xl font-aptos italic mb-6 text-white/80 tracking-wide">
              Open Innovation
            </p>
            <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-aptos font-bold mb-8 text-blue-300 leading-[1.1] tracking-tight">
              AI-Driven VC Investment Platform
            </h1>
            <h2 className="text-lg md:text-xl font-aptos font-semibold italic mb-10 text-white/95 leading-relaxed tracking-wide">
              Smart Screening, Analysis &amp; Evaluation in Minutes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 text-base md:text-lg text-white/85 leading-relaxed">
              <p className="font-light">
                <strong className="font-semibold text-sky-300">Investors:</strong> Customizable AI analysis of Product, Market, Team, and Financials so you can evaluate 10x deals in 1/10th the time.
              </p>
              <p className="font-light">
                <strong className="font-semibold text-sky-300">Founders:</strong> AI Driven matching to investors and prompt feedback.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-sm md:text-base text-white/70 leading-relaxed">
                  We are launching in phases. We welcome Investors and Founders to join us.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="https://forms.gle/GyhLRQ3jjF6tPwCK8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-orange-600 text-white px-8 py-4 rounded-lg text-base md:text-lg font-medium hover:bg-orange-700 transition-all duration-300 inline-flex items-center shadow-lg tracking-wide"
                >
                  Join Us <ChevronRight className="inline w-5 h-5 ml-2" />
                </a>
                <img
                  src="/PitchFork-QRCode.png"
                  alt="Join PitchFork Interest List QR Code"
                  className="w-16 h-16 rounded-lg border border-white/20 shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Business Meeting Photo */}
        <div className="w-full lg:w-[40%] relative flex items-start justify-center bg-black pt-8 pb-8">
          <img 
            src="/business-meeting.jpeg" 
            alt="Business meeting" 
            className="w-[90%] h-auto object-contain"
          />
        </div>
      </section>

      {/* Benefits Section */}
      <section className={`py-16 ${isDark ? 'bg-navy-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-aptos font-bold mb-4 text-blue-600">Why Choose PitchFork?</h2>
            <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'} max-w-3xl mx-auto font-body`}>
              Intelligent investor-founder matching, automated screening, 4-category AI analysis, and sophisticated report generation in minutes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className={`p-6 rounded-xl ${isDark ? 'bg-navy-800 border border-navy-700' : 'bg-silver-50 border border-silver-200'} hover:shadow-financial transition-all duration-300 hover:scale-105`}>
                <div className="mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-aptos font-bold mb-3 text-slate-900 dark:text-silver-100">{benefit.title}</h3>
                <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed font-body`}>{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={`py-16 ${isDark ? 'bg-navy-950' : 'bg-gradient-to-br from-blue-50 to-silver-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-aptos font-bold mb-4 text-blue-600">The PitchFork Workflow</h2>
            <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'} max-w-3xl mx-auto font-body`}>
              From intelligent investor-founder matching to sophisticated report generation in minutes—streamlined deal evaluation powered by AI
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {flowSteps.map((step, index) => (
              <div key={index} className={`relative p-6 rounded-xl ${isDark ? 'bg-navy-800 border border-navy-700' : 'bg-white border border-silver-200'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                  {step.step}
                </div>
                <h3 className="text-xl font-aptos font-bold mb-3 mt-2 text-slate-900 dark:text-silver-100">{step.title}</h3>
                <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed font-body`}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4-Category Analysis Framework */}
      <section className={`py-16 ${isDark ? 'bg-navy-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-aptos font-bold mb-4 text-blue-600">Comprehensive 4-Category Analysis</h2>
            <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'} max-w-3xl mx-auto font-body`}>
              Every venture receives deep analysis across 16 subcategories organized into four key dimensions
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Product/Service */}
            <div className={`p-8 rounded-xl ${isDark ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'} border shadow-lg`}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-4">1</div>
                <h3 className="text-2xl font-bold text-blue-600">Product/Service</h3>
              </div>
              <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-700'}`}>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-blue-600 mr-2 mt-1 flex-shrink-0" /> Problem-Solution fit</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-blue-600 mr-2 mt-1 flex-shrink-0" /> Differentiation & Defensibility</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-blue-600 mr-2 mt-1 flex-shrink-0" /> Product–Market Readiness</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-blue-600 mr-2 mt-1 flex-shrink-0" /> Commercial Traction & Validation</li>
              </ul>
            </div>

            {/* Market */}
            <div className={`p-8 rounded-xl ${isDark ? 'bg-gradient-to-br from-green-900/30 to-teal-900/30 border-green-700' : 'bg-gradient-to-br from-green-50 to-teal-50 border-green-200'} border shadow-lg`}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-4">2</div>
                <h3 className="text-2xl font-bold text-green-600">Market</h3>
              </div>
              <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-700'}`}>
                <li className="flex items-start"><TrendingUp className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Serviceable Market Size & Growth</li>
                <li className="flex items-start"><TrendingUp className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Competitive Landscape</li>
                <li className="flex items-start"><TrendingUp className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Competitive Advantage & Positioning</li>
                <li className="flex items-start"><TrendingUp className="w-5 h-5 text-green-600 mr-2 mt-1 flex-shrink-0" /> Adoption Drivers & Risks</li>
              </ul>
            </div>

            {/* Leadership Team */}
            <div className={`p-8 rounded-xl ${isDark ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-700' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'} border shadow-lg`}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-4">3</div>
                <h3 className="text-2xl font-bold text-blue-600">Leadership Team</h3>
              </div>
              <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-700'}`}>
                <li className="flex items-start"><Users className="w-5 h-5 text-blue-600 mr-2 mt-1 flex-shrink-0" /> Founder's experience</li>
                <li className="flex items-start"><Users className="w-5 h-5 text-blue-600 mr-2 mt-1 flex-shrink-0" /> Go to Market leadership</li>
                <li className="flex items-start"><Users className="w-5 h-5 text-blue-600 mr-2 mt-1 flex-shrink-0" /> Execution/Operations</li>
                <li className="flex items-start"><Users className="w-5 h-5 text-blue-600 mr-2 mt-1 flex-shrink-0" /> Finance & Governance</li>
              </ul>
            </div>

            {/* Financials */}
            <div className={`p-8 rounded-xl ${isDark ? 'bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-700' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'} border shadow-lg`}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-4">4</div>
                <h3 className="text-2xl font-bold text-purple-600">Financials</h3>
              </div>
              <ul className={`space-y-2 ${isDark ? 'text-silver-300' : 'text-slate-700'}`}>
                <li className="flex items-start"><BarChart3 className="w-5 h-5 text-purple-600 mr-2 mt-1 flex-shrink-0" /> Revenue & Growth</li>
                <li className="flex items-start"><BarChart3 className="w-5 h-5 text-purple-600 mr-2 mt-1 flex-shrink-0" /> Financial Health & Burn</li>
                <li className="flex items-start"><BarChart3 className="w-5 h-5 text-purple-600 mr-2 mt-1 flex-shrink-0" /> Capital Raised & Structure</li>
                <li className="flex items-start"><BarChart3 className="w-5 h-5 text-purple-600 mr-2 mt-1 flex-shrink-0" /> Valuation & Benchmarking</li>
              </ul>
            </div>
          </div>

          <div className={`mt-12 p-8 rounded-xl ${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border text-center`}>
            <p className="text-xl font-semibold mb-2 text-blue-600">Plus: Analysis includes public data from websites, LinkedIn, publications, and more</p>
            <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'}`}>
              AI combines submitted documents with publicly available information for the most comprehensive analysis possible
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={`py-16 ${isDark ? 'bg-navy-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-aptos font-bold mb-4 text-blue-600">What Our Users Say</h2>
            <p className={`text-xl ${isDark ? 'text-silver-300' : 'text-slate-600'} font-body`}>
              Trusted by leading angel investors and investment groups
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className={`p-6 rounded-xl ${isDark ? 'bg-navy-800 border border-navy-700' : 'bg-silver-50 border border-silver-200'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                <div className="flex mb-3">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-blue-400 text-blue-400" />
                  ))}
                </div>
                <p className={`mb-4 italic ${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed font-body`}>
                  "{testimonial.quote}"
                </p>
                <p className="font-aptos font-bold text-blue-600">- {testimonial.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className={`py-16 ${isDark ? 'bg-navy-950' : 'bg-gradient-to-br from-silver-50 to-navy-50'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
           <h2 className="text-4xl font-aptos font-bold mb-4 text-blue-600">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <div key={index} className={`p-6 rounded-xl ${isDark ? 'bg-navy-800 border border-navy-700' : 'bg-white border border-silver-200'} shadow-lg hover:shadow-xl transition-all duration-300`}>
               <h3 className="text-xl font-aptos font-bold mb-3 text-slate-900 dark:text-silver-100">{faq.question}</h3>
               <p className={`${isDark ? 'text-silver-300' : 'text-slate-600'} leading-relaxed font-body`}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-16 ${isDark ? 'bg-navy-900' : 'bg-navy-950'} text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-aptos font-bold mb-4 text-blue-400">Ready to Transform Your Investment Process?</h2>
            <p className="text-xl text-silver-300 mb-8 font-body">
              Join hundreds of investors making smarter decisions with PitchFork
            </p>
            <Link to="/login" className="bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-700 transition-all duration-300 inline-flex items-center shadow-lg">
              Get Started Today <ChevronRight className="inline w-5 h-5 ml-2" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold text-blue-400 mb-4">
                PitchFork
              </div>
              <p className="text-silver-300 leading-relaxed">
                Empowering investors with AI-driven analysis for smarter investment decisions.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-blue-400">Contact</h4>
              <p className="text-silver-300 mb-2">hello@pitchfork.com</p>
              <p className="text-silver-300">+1 (555) 123-4567</p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-blue-400">Product</h4>
              <ul className="space-y-2 text-silver-300">
                <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/demo" className="hover:text-white transition-colors">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-blue-400">Legal</h4>
              <ul className="space-y-2 text-silver-300">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-navy-700 pt-8 text-center text-silver-400">
            <p>&copy; 2025 PitchFork. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <HomePage 
              isDark={isDark} 
              setIsDark={setIsDark} 
              isMobileMenuOpen={isMobileMenuOpen} 
              setIsMobileMenuOpen={setIsMobileMenuOpen} 
            />
          } 
        />
        <Route 
          path="/login" 
          element={<LoginPage isDark={isDark} toggleTheme={toggleTheme} />} 
        />
        <Route 
          path="/signup" 
          element={<SignUpPage isDark={isDark} toggleTheme={toggleTheme} />} 
        />
        <Route 
          path="/dashboard" 
          element={<Dashboard isDark={isDark} toggleTheme={toggleTheme} />} 
        />
        <Route 
          path="/submit-files" 
          element={<SubmitFiles isDark={isDark} toggleTheme={toggleTheme} />} 
        />
        <Route 
          path="/edit-company" 
          element={<EditCompany isDark={isDark} toggleTheme={toggleTheme} />} 
        />
        <Route 
          path="/submit-pitch-deck" 
          element={<FounderSubmission isDark={isDark} toggleTheme={toggleTheme} />} 
        />
        <Route 
          path="/venture/:id" 
          element={<VentureDetail isDark={isDark} toggleTheme={toggleTheme} />} 
        />
        <Route 
          path="/founder-dashboard" 
          element={<FounderDashboard isDark={isDark} toggleTheme={toggleTheme} />} 
        />
        <Route
          path="/edit-prompts"
          element={<EditPrompts isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/company-list"
          element={<CompanyList isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/test-files"
          element={<TestFiles isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/investor-selection"
          element={<InvestorSelectionWrapper />}
        />
        <Route
          path="/investor-preferences"
          element={<InvestorPreferences isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/investor-prompts"
          element={<InvestorPrompts isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/help"
          element={<Help isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/account"
          element={<Account isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/features"
          element={<Features isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/pricing"
          element={<Pricing isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/demo"
          element={<Demo isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/privacy"
          element={<Privacy isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/terms"
          element={<Terms isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/security"
          element={<Security isDark={isDark} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/company-investor-match"
          element={<CompanyInvestorMatch isDark={isDark} toggleTheme={toggleTheme} />}
        />
      </Routes>
    </Router>
  );
}

export default App;