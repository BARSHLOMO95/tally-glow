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
  Loader2
} from 'lucide-react';

// Simulated invoice data
const mockInvoices = [
  { supplier: 'אופיס דיפו', amount: '₪2,450', date: '15/01', status: 'done' },
  { supplier: 'בזק בינלאומי', amount: '₪890', date: '14/01', status: 'done' },
  { supplier: 'הום סנטר', amount: '₪3,200', date: '13/01', status: 'processing' },
];

const SystemMockup = () => {
  const [demoStage, setDemoStage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setDemoStage((prev) => (prev + 1) % 4);
    }, 3500);
    return () => clearInterval(timer);
  }, [isHovered]);

  return (
    <motion.div
      className="relative w-full max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Shadow/glow - subtle */}
      <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl" />
      
      {/* Browser frame */}
      <div className="relative bg-card rounded-xl md:rounded-2xl overflow-hidden border shadow-2xl">
        {/* Browser header */}
        <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b bg-muted/30">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-muted-foreground/20" />
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-muted-foreground/20" />
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="flex-1 mx-2 md:mx-4">
            <div className="bg-muted rounded px-3 py-1 text-xs text-muted-foreground text-center max-w-[200px] mx-auto">
              app.invoiceai.co.il
            </div>
          </div>
        </div>

        {/* App content */}
        <div className="relative h-[240px] sm:h-[280px] md:h-[340px] bg-background">
          {/* Mini sidebar - desktop only */}
          <div className="absolute top-0 right-0 w-14 md:w-16 h-full bg-muted/30 border-l hidden sm:block">
            <div className="p-2 space-y-3 pt-4">
              <div className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center transition-colors ${demoStage === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="w-10 h-10 mx-auto rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Main area */}
          <div className="h-full sm:mr-14 md:mr-16 p-3 md:p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm md:text-base font-semibold">חשבוניות</h3>
              <motion.button
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                animate={{ scale: demoStage === 1 ? [1, 1.05, 1] : 1 }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">העלאה</span>
              </motion.button>
            </div>

            {/* Demo content */}
            <AnimatePresence mode="wait">
              {demoStage === 0 && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  {mockInvoices.map((invoice, i) => (
                    <motion.div
                      key={i}
                      className="bg-muted/50 rounded-lg p-2.5 md:p-3 flex items-center justify-between"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-xs md:text-sm">{invoice.supplier}</p>
                          <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {invoice.date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs md:text-sm">{invoice.amount}</span>
                        {invoice.status === 'done' ? (
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                        ) : (
                          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {demoStage === 1 && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-44 md:h-52 flex flex-col items-center justify-center"
                >
                  <motion.div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 border-dashed border-primary/50 flex items-center justify-center mb-4"
                    animate={{ borderColor: ['hsl(var(--primary) / 0.3)', 'hsl(var(--primary))', 'hsl(var(--primary) / 0.3)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <ArrowUp className="w-7 h-7 md:w-8 md:h-8 text-primary" />
                    </motion.div>
                  </motion.div>
                  <p className="text-sm font-medium">מעלה חשבונית...</p>
                  <p className="text-xs text-muted-foreground mt-1">invoice_2026.pdf</p>
                </motion.div>
              )}

              {demoStage === 2 && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-44 md:h-52 flex flex-col items-center justify-center"
                >
                  <motion.div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-primary" />
                  </motion.div>
                  <p className="text-sm font-medium text-primary">מעבד עם AI...</p>
                  <div className="flex gap-1 mt-3">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {demoStage === 3 && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="h-44 md:h-52 flex flex-col items-center justify-center"
                >
                  <motion.div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <Check className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                  </motion.div>
                  <p className="text-sm font-medium text-primary">הושלם בהצלחה!</p>
                  <motion.div
                    className="mt-3 bg-muted/50 rounded-lg px-4 py-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">ספק:</span>
                      <span className="font-medium">מחשבי אלון</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="font-semibold text-primary">₪4,850</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Stage indicators */}
        <div className="flex justify-center gap-1.5 py-3 border-t bg-muted/20">
          {[0, 1, 2, 3].map((stage) => (
            <button
              key={stage}
              onClick={() => setDemoStage(stage)}
              className={`h-1.5 rounded-full transition-all ${
                demoStage === stage 
                  ? 'bg-primary w-4' 
                  : 'bg-muted-foreground/20 w-1.5 hover:bg-muted-foreground/40'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SystemMockup;
