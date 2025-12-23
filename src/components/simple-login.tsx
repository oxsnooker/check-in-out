'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signInWithEmail, type State } from '@/lib/actions';
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
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useActionState(signInWithEmail, initialState);

  React.useEffect(() => {
    if (state?.message) {
       if (state.errors && Object.keys(state.errors).length > 0) {
        toast({
            title: 'Sign In Error',
            description: state.message,
            variant: 'destructive',
        });
       }
    }
  }, [state, toast]);

  return (
    <Card className="mx-auto mt-12 max-w-sm">
      <form action={dispatch}>
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
              placeholder="staff@example.com"
              required
            />
            {state?.errors?.email && (
              <p className="text-sm font-medium text-destructive">
                {state.errors.email}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
            {state?.errors?.password && (
              <p className="text-sm font-medium text-destructive">
                {state.errors.password}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <LoginSubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
