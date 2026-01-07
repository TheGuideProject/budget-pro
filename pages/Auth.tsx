import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mail, Lock, AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles, Brain, Mic, BarChart3, Shield } from 'lucide-react';
import { z } from 'zod';
import budgetProLogo from '@/assets/budgetpro-logo.png';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Email non valida" }).max(255),
  password: z.string().min(6, { message: "La password deve essere di almeno 6 caratteri" }).max(100),
});

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Email non valida" }),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  
  // CAPTCHA state
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  // Generate random math CAPTCHA
  const captcha = useMemo(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    return { num1, num2, result: num1 + num2 };
  }, [isLogin]); // Regenerate when switching modes

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setFieldErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: { email?: string; password?: string } = {};
        err.errors.forEach((e) => {
          if (e.path[0] === 'email') errors.email = e.message;
          if (e.path[0] === 'password') errors.password = e.message;
        });
        setFieldErrors(errors);
      }
      return false;
    }
  };

  const validateCaptcha = () => {
    if (!isLogin) {
      const answer = parseInt(captchaAnswer, 10);
      if (isNaN(answer) || answer !== captcha.result) {
        setCaptchaError('Risposta CAPTCHA non corretta');
        return false;
      }
    }
    setCaptchaError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCaptchaError('');

    if (!validateForm()) return;
    if (!validateCaptcha()) return;

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Credenziali non valide. Verifica email e password.');
          } else {
            setError(error.message);
          }
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('Un utente con questa email esiste già. Prova ad accedere.');
          } else {
            setError(error.message);
          }
        } else {
          setSignupSuccess(true);
        }
      }
    } catch (err) {
      setError('Si è verificato un errore. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError('');

    try {
      emailSchema.parse({ email: forgotPasswordEmail });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setForgotPasswordError(err.errors[0].message);
        return;
      }
    }

    setForgotPasswordLoading(true);

    try {
      const { error } = await resetPassword(forgotPasswordEmail);
      if (error) {
        setForgotPasswordError(error.message);
      } else {
        setForgotPasswordSuccess(true);
      }
    } catch (err) {
      setForgotPasswordError('Si è verificato un errore. Riprova più tardi.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const features = [
    { icon: Brain, label: 'AI Insights' },
    { icon: Sparkles, label: 'OCR Smart' },
    { icon: Mic, label: 'Voice Input' },
    { icon: BarChart3, label: 'Analytics' },
  ];

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background" />
        
        <div className="glass-card p-8 max-w-md w-full text-center relative z-10 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Registrazione Completata!</h2>
          <p className="text-muted-foreground mb-6">
            Abbiamo inviato un'email di conferma a <strong>{email}</strong>. 
            Clicca sul link nell'email per attivare il tuo account.
          </p>
          <Button 
            onClick={() => { setSignupSuccess(false); setIsLogin(true); }}
            className="w-full gradient-button"
          >
            Torna al Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-mesh opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/90 to-background" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo Header */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
            <img 
              src={budgetProLogo} 
              alt="BudgetPro" 
              className="w-20 h-20 mx-auto relative z-10 drop-shadow-2xl"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              BudgetPro
            </h1>
            <p className="text-muted-foreground mt-1">Gestione Finanze Intelligente</p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="glass-card p-8 space-y-6">
          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-muted/50 p-1 relative">
            <div 
              className={`absolute inset-y-1 w-[calc(50%-4px)] bg-background rounded-lg shadow-lg transition-all duration-300 ease-out ${
                isLogin ? 'left-1' : 'left-[calc(50%+2px)]'
              }`}
            />
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); setFieldErrors({}); setCaptchaAnswer(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg relative z-10 transition-colors ${
                isLogin ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); setFieldErrors({}); setCaptchaAnswer(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg relative z-10 transition-colors ${
                !isLogin ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Registrati
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-muted/30 border-muted-foreground/20 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="text-destructive text-sm flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-muted/30 border-muted-foreground/20 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-destructive text-sm flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* CAPTCHA for Registration */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="captcha" className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Verifica di sicurezza
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                    <span className="font-mono font-bold text-lg">
                      {captcha.num1} + {captcha.num2} = ?
                    </span>
                  </div>
                  <Input
                    id="captcha"
                    type="text"
                    inputMode="numeric"
                    placeholder="?"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="h-12 w-24 text-center text-lg font-bold bg-muted/30 border-muted-foreground/20 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
                {captchaError && (
                  <p className="text-destructive text-sm flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {captchaError}
                  </p>
                )}
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="animate-shake">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold gradient-button relative overflow-hidden group"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Attendere...</span>
                </div>
              ) : (
                <span>{isLogin ? 'Accedi' : 'Crea Account'}</span>
              )}
            </Button>
          </form>

          {/* Forgot Password */}
          {isLogin && (
            <div className="text-center">
              <Dialog open={forgotPasswordOpen} onOpenChange={(open) => {
                setForgotPasswordOpen(open);
                if (!open) {
                  setForgotPasswordSuccess(false);
                  setForgotPasswordError('');
                  setForgotPasswordEmail('');
                }
              }}>
                <DialogTrigger asChild>
                  <button className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Password dimenticata?
                  </button>
                </DialogTrigger>
                <DialogContent className="glass-card border-none">
                  <DialogHeader>
                    <DialogTitle>Recupera Password</DialogTitle>
                    <DialogDescription>
                      Inserisci la tua email per ricevere il link di reset.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {forgotPasswordSuccess ? (
                    <div className="py-6 text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-muted-foreground">
                        Email inviata! Controlla la tua casella di posta.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4 pt-4">
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          type="email"
                          placeholder="nome@esempio.com"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          className="pl-10 h-12 bg-muted/30"
                          required
                        />
                      </div>
                      {forgotPasswordError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{forgotPasswordError}</AlertDescription>
                        </Alert>
                      )}
                      <Button
                        type="submit"
                        disabled={forgotPasswordLoading}
                        className="w-full h-11 gradient-button"
                      >
                        {forgotPasswordLoading ? 'Invio in corso...' : 'Invia Link'}
                      </Button>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Features Pills */}
        <div className="flex flex-wrap justify-center gap-3">
          {features.map((feature, index) => (
            <div 
              key={feature.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 backdrop-blur-sm border border-muted-foreground/10 text-sm animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <feature.icon className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
