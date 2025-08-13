import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';

// Import components
import { LoginForm } from '@/components/LoginForm';
import { CitizenDashboard } from '@/components/CitizenDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';

// Import types
import type { User } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await trpc.loginUser.query({ username, password });
      if (user) {
        setCurrentUser(user);
      } else {
        setError('Username atau password tidak valid');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Terjadi kesalahan saat login. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setError(null);
  };

  // If user is not logged in, show login form
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mb-4">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl text-white">🏠</span>
                </div>
              </div>
              <CardTitle className="text-2xl text-green-800">
                Sistem Iuran Sampah RT
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Kelola pembayaran dan riwayat iuran sampah bulanan
              </p>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              <LoginForm onLogin={handleLogin} isLoading={isLoading} />
            </CardContent>
          </Card>
          
          {/* Demo credentials info */}
          <Card className="mt-4 shadow-sm border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-800 font-medium mb-2">
                ℹ️ Catatan: Backend menggunakan data dummy
              </p>
              <p className="text-xs text-blue-700">
                Saat ini handler backend masih dalam tahap pengembangan. 
                Frontend sudah siap untuk integrasi dengan database sesungguhnya.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show appropriate dashboard based on user role
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🏠</span>
              <div>
                <h1 className="text-xl font-bold">Sistem Iuran Sampah RT</h1>
                <p className="text-green-100 text-sm">
                  {currentUser.role === 'admin_kelurahan' ? 'Admin Kelurahan' : 'Portal Warga'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-medium">{currentUser.full_name}</p>
                <p className="text-green-200 text-sm">
                  {currentUser.role === 'admin_kelurahan' ? 'Administrator' : `RT ${currentUser.rt}`}
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="bg-white text-green-600 hover:bg-green-50"
              >
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {currentUser.role === 'admin_kelurahan' ? (
          <AdminDashboard currentUser={currentUser} />
        ) : (
          <CitizenDashboard currentUser={currentUser} />
        )}
      </main>
    </div>
  );
}

export default App;