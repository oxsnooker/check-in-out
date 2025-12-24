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
import { LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

function LoginSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Signing In...' : 'Sign In'}
      <LogIn className="ml-2 size-4" />
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

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      toast({
        title: 'Sign In Error',
        description: 'Email and password are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth state change will be handled by the useUser hook
      // and AuthGate component. No need to redirect here.
       toast({
            title: 'Sign In Successful',
            description: "You're now logged in.",
        });
    } catch (error: any) {
      let errorMessage = 'An unknown error occurred.';
      switch (error.code) {
        case 'auth/user-not-found':
          // If user does not exist, try creating a new user.
          try {
            await createUserWithEmailAndPassword(auth, email, password);
            toast({
              title: 'Account Created',
              description: 'New admin account created. You are now logged in.',
            });
          } catch (creationError: any) {
             toast({
              title: 'Sign Up Error',
              description: creationError.message || 'Could not create account.',
              variant: 'destructive',
            });
          }
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please try again.';
           toast({
            title: 'Sign In Error',
            description: errorMessage,
            variant: 'destructive',
          });
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
           toast({
            title: 'Sign In Error',
            description: errorMessage,
            variant: 'destructive',
          });
          break;
        default:
          errorMessage = error.message;
           toast({
            title: 'Sign In Error',
            description: errorMessage,
            variant: 'destructive',
          });
          break;
      }
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="mx-auto max-w-sm">
        <form onSubmit={handleSignIn}>
          <CardHeader className="text-center">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
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
                defaultValue="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required defaultValue="password" />
            </div>
          </CardContent>
          <CardFooter>
            <LoginSubmitButton />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
