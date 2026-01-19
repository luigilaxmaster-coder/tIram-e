import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMember } from '@/integrations';
import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';

interface SignInProps {
  title?: string;
  message?: string;
  className?: string;
  cardClassName?: string;
  buttonClassName?: string;
  buttonText?: string;
}

export function SignIn({
  title = "Sign In Required",
  message = "Please sign in to access this content.",
  className = "min-h-screen flex items-center justify-center px-4 ",
  cardClassName = "w-fit max-w-xl mx-auto text-foreground",
  buttonClassName = "w-full h-10 max-w-sm mx-auto",
  buttonText = "Sign In"
}: SignInProps) {
  const { actions } = useMember();

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className={cardClassName}>
          <CardHeader className="text-center space-y-6 py-10 px-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                delay: 0.2,
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center relative"
            >
              <Lock className="w-10 h-10 text-primary" />
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
                className="absolute -top-1 -right-1"
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <CardTitle className="text-3xl">{title}</CardTitle>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <CardDescription className="text-base">{message}</CardDescription>
            </motion.div>
          </CardHeader>
          
          <CardContent className="text-center px-10 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={actions.login} 
                className={`${buttonClassName} relative overflow-hidden group`}
              >
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0"
                  animate={{
                    x: ['-100%', '100%']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                />
                <span className="relative z-10">{buttonText}</span>
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
