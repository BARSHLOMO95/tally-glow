import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  Check, 
  Sparkles, 
  ArrowUp,
  Building2,
  Calendar,
  CreditCard,
  Loader2
} from 'lucide-react';

// Simulated invoice data for the demo
const mockInvoices = [
  { supplier: 'אופיס דיפו', amount: '₪2,450', date: '15/01/2026', status: 'done' },
  { supplier: 'בזק בינלאומי', amount: '₪890', date: '14/01/2026', status: 'done' },
  { supplier: 'הום סנטר', amount: '₪3,200', date: '13/01/2026', status: 'processing' },
];

const SystemMockup = () => {
  const [demoStage, setDemoStage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-cycle through demo stages
  useEffect(() => {
    if (isHovered) return;
    
    const timer = setInterval(() => {
      setDemoStage((prev) => (prev + 1) % 4);
    }, 3000);
    
    return () => clearInterval(timer);
  }, [isHovered]);

  return (
    <motion.div
      className="relative w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect behind mockup */}
      <div className="absolute -inset-4 md:-inset-8 bg-gradient-to-r from-primary/30 via-purple-500/20 to-pink-500/30 rounded-3xl blur-3xl opacity-60 animate-pulse" />
      
      {/* Browser frame */}
      <div className="relative glass-dark rounded-2xl md:rounded-3xl overflow-hidden border border-border/50 shadow-2xl">
        {/* Browser header */}
        <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b border-border/50 bg-card/50">
          <div className="flex gap-1.5 md:gap-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 mx-2 md:mx-4">
            <div className="bg-muted/50 rounded-lg px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-sm text-muted-foreground text-center truncate">
              app.invoiceai.co.il
            </div>
          </div>
        </div>

        {/* App content */}
        <div className="relative h-[280px] sm:h-[350px] md:h-[420px] bg-background/80">
          {/* Sidebar simulation */}
          <div className="absolute top-0 right-0 w-12 sm:w-16 md:w-20 h-full bg-card/80 border-l border-border/50 hidden sm:block">
            <div className="p-2 md:p-3 space-y-3 md:space-y-4">
              <motion.div 
                className={`w-8 h-8 md:w-10 md:h-10 mx-auto rounded-xl flex items-center justify-center ${demoStage === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                animate={{ scale: demoStage === 0 ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 0.5 }}
              >
                <FileText className="w-4 h-4 md:w-5 md:h-5" />
              </motion.div>
              <div className="w-8 h-8 md:w-10 md:h-10 mx-auto rounded-xl bg-muted flex items-center justify-center">
                <Building2 className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 mx-auto rounded-xl bg-muted flex items-center justify-center">
                <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div className="h-full sm:mr-16 md:mr-20 p-3 sm:p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <h3 className="text-sm md:text-lg font-bold text-foreground">חשבוניות</h3>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">ינואר 2026</p>
              </div>
              <motion.button
                className="bg-gradient-to-r from-primary to-purple-600 text-white px-2 sm:px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2"
                animate={{ scale: demoStage === 1 ? [1, 1.05, 1] : 1 }}
              >
                <Upload className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">העלאה</span>
              </motion.button>
            </div>

            {/* Stage-based content */}
            <AnimatePresence mode="wait">
              {/* Stage 0: Invoice list */}
              {demoStage === 0 && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-2 md:space-y-3"
                >
                  {mockInvoices.map((invoice, i) => (
                    <motion.div
                      key={i}
                      className="bg-card/60 backdrop-blur rounded-lg md:rounded-xl p-2 sm:p-3 md:p-4 flex items-center justify-between border border-border/30"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                          <FileText className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-xs sm:text-sm md:text-base">{invoice.supplier}</p>
                          <div className="flex items-center gap-1 md:gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 hidden sm:block" />
                            <span className="hidden sm:inline">{invoice.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="font-bold text-xs sm:text-sm md:text-lg">{invoice.amount}</span>
                        {invoice.status === 'done' ? (
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Check className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 text-amber-500 animate-spin" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Stage 1: Upload animation */}
              {demoStage === 1 && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="h-48 sm:h-52 md:h-64 flex flex-col items-center justify-center"
                >
                  <motion.div
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl border-2 border-dashed border-primary/50 flex items-center justify-center mb-4 md:mb-6"
                    animate={{ 
                      borderColor: ['hsla(var(--primary), 0.5)', 'hsla(var(--primary), 1)', 'hsla(var(--primary), 0.5)'],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowUp className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                    </motion.div>
                  </motion.div>
                  <p className="text-sm md:text-lg font-medium text-foreground">מעלה חשבונית...</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">invoice_2026_01.pdf</p>
                </motion.div>
              )}

              {/* Stage 2: AI Processing */}
              {demoStage === 2 && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-48 sm:h-52 md:h-64 flex flex-col items-center justify-center"
                >
                  <motion.div
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 flex items-center justify-center mb-4 md:mb-6"
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                      scale: { duration: 1, repeat: Infinity }
                    }}
                  >
                    <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-white" />
                  </motion.div>
                  <p className="text-sm md:text-lg font-medium gradient-text">מעבד עם AI...</p>
                  <div className="flex gap-1 mt-3 md:mt-4">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Stage 3: Success */}
              {demoStage === 3 && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="h-48 sm:h-52 md:h-64 flex flex-col items-center justify-center"
                >
                  <motion.div
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-4 md:mb-6"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                    >
                      <Check className="w-8 h-8 md:w-12 md:h-12 text-green-500" />
                    </motion.div>
                  </motion.div>
                  <p className="text-sm md:text-lg font-medium text-green-500">החשבונית עובדה בהצלחה!</p>
                  <motion.div
                    className="mt-3 md:mt-4 bg-card/60 backdrop-blur rounded-lg md:rounded-xl p-2 md:p-3 border border-green-500/30"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm">
                      <span className="text-muted-foreground">ספק:</span>
                      <span className="font-medium">מחשבי אלון</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-muted-foreground">סכום:</span>
                      <span className="font-bold text-primary">₪4,850</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Floating elements for visual interest */}
          <motion.div
            className="absolute top-4 left-4 w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-r from-primary/40 to-purple-500/40 hidden sm:block"
            animate={{ 
              y: [0, -10, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-8 left-8 w-4 h-4 md:w-6 md:h-6 rounded-lg bg-gradient-to-r from-pink-500/40 to-purple-500/40 hidden sm:block"
            animate={{ 
              y: [0, 10, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Stage indicators */}
      <div className="flex justify-center gap-2 mt-4 md:mt-6">
        {[0, 1, 2, 3].map((stage) => (
          <button
            key={stage}
            onClick={() => setDemoStage(stage)}
            className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all ${
              demoStage === stage 
                ? 'bg-primary w-5 md:w-6' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>
      <p className="text-center text-xs md:text-sm text-muted-foreground mt-2">
        {['צפייה ברשימה', 'העלאת חשבונית', 'עיבוד AI', 'הושלם!'][demoStage]}
      </p>
    </motion.div>
  );
};

export default SystemMockup;
