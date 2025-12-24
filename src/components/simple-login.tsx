'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { LogIn, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

function SubmitButton({ isSignUp }: { isSignUp: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {isSignUp ? (
        <>
          {pending ? 'Creating Account...' : 'Create Account'}
          <UserPlus className="ml-2 size-4" />
        </>
      ) : (
        <>
          {pending ? 'Signing In...' : 'Sign In'}
          <LogIn className="ml-2 size-4" />
        </>
      )}
    </Button>
  );
}

interface SimpleLoginProps {
  title: string;
  description: string;
}

export function SimpleLogin({ title, description }: SimpleLoginProps) {
  const { toast } = useToast();
  const auth = useAuth();
  const [isSignUp, setIsSignUp] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      toast({
        title: 'Authentication Error',
        description: 'Email and password are required.',
        variant: 'destructive',
      });
      return;
    }

    if (isSignUp) {
      // Handle Sign Up
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({
          title: 'Account Created',
          description: 'You have been successfully signed up and logged in.',
        });
      } catch (error: any) {
        toast({
          title: 'Sign Up Error',
          description: error.message || 'Could not create your account.',
          variant: 'destructive',
        });
      }
    } else {
      // Handle Sign In
      try {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: 'Sign In Successful',
          description: "You're now logged in.",
        });
      } catch (error: any) {
        let errorMessage = 'An unknown error occurred.';
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password. Please try again.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          default:
            errorMessage = error.message;
            break;
        }
        toast({
          title: 'Sign In Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="mx-auto max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <CardTitle>{isSignUp ? 'Create an Account' : title}</CardTitle>
            <CardDescription>
              {isSignUp
                ? 'Enter your email and password to sign up.'
                : description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <SubmitButton isSignUp={isSignUp} />
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
