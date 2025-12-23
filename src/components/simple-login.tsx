'use client';

import * as React from 'react';
import { useAuth, initiateAnonymousSignIn } from '@/firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LogIn } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface SimpleLoginProps {
    title: string;
    description: string;
}

export function SimpleLogin({ title, description }: SimpleLoginProps) {
  const auth = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleSignIn = () => {
    setLoading(true);
    initiateAnonymousSignIn(auth);
    // The onAuthStateChanged listener in FirebaseProvider will handle the redirect.
  };

  if (loading) {
    return (
        <Card className="mx-auto mt-12 max-w-sm">
            <CardHeader className="text-center">
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <Skeleton className="h-10 w-full" />
                <p className="text-sm text-muted-foreground">Signing in...</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="mx-auto mt-12 max-w-sm">
        <CardHeader className="text-center">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handleSignIn} className="w-full">
                <LogIn className="mr-2 size-4" />
                Sign In Anonymously
            </Button>
        </CardContent>
    </Card>
  );
}
