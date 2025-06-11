import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Now we can update the password
        console.log("Password recovery event received");
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    setError('');
    setMessage('');
    setLoading(true);

    const { error: updateError, message: updateMessage } = await updatePassword(password);

    if (updateError) {
      setError(updateError.message || 'Failed to update password.');
    } else {
      setMessage(updateMessage || 'Password updated successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Update Password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {message && <p className="text-green-500 text-sm">{message}</p>}
            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 