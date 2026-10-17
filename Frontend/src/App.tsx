import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import SplashCursor from './components/SplashCursor';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Wizard from './pages/Wizard';
import Results from './pages/Results';
import Details from './pages/Details';
import Saved from './pages/Saved';

import ProtectedRoute from './components/auth/ProtectedRoute';

// Wrapper for animated routes
const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
                <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />

                {/* Public Routes */}
                <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
                <Route path="/home" element={<PageTransition><Landing /></PageTransition>} />
                <Route path="/results" element={<PageTransition><Results /></PageTransition>} />
                <Route path="/house/:id" element={<PageTransition><Details /></PageTransition>} />

                {/* Protected Routes */}
                <Route path="/wizard" element={<ProtectedRoute><PageTransition><Wizard /></PageTransition></ProtectedRoute>} />
                <Route path="/saved" element={<ProtectedRoute><PageTransition><Saved /></PageTransition></ProtectedRoute>} />
            </Routes>
        </AnimatePresence>
    );
};

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const isResultsPage = location.pathname === '/results';

  return (
    <>
      <SplashCursor 
        SIM_RESOLUTION={isResultsPage ? 64 : 108}
        DYE_RESOLUTION={isResultsPage ? 512 : 1024}
        PRESSURE_ITERATIONS={isResultsPage ? 10 : 20}
        SPLAT_RADIUS={isResultsPage ? 0.2 : 0.25}
        SPLAT_FORCE={3000}
        COLOR_UPDATE_SPEED={8}
        TRANSPARENT={true}
      />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex flex-col pt-14">
          <AnimatedRoutes />
        </main>
        <Footer />
      </div>
    </>
  );
}

export default App;
