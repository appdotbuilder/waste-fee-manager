import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Users, DollarSign, AlertTriangle, FileText } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import components
import { CitizenManagement } from '@/components/CitizenManagement';
import { PaymentManagement } from '@/components/PaymentManagement';
import { DisputeManagement } from '@/components/DisputeManagement';

// Import types
import type { User, Payment, Dispute } from '../../../server/src/schema';

interface AdminDashboardProps {
  currentUser: User;
}

export function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [citizens, setCitizens] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load all data
  const loadCitizens = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      // Filter out admin users, show only citizens
      setCitizens(result.filter((user: User) => user.role === 'warga'));
    } catch (error) {
      console.error('Failed to load citizens:', error);
      setCitizens([]); // Set empty array for stub behavior
    }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const result = await trpc.getAllPayments.query();
      setPayments(result);
    } catch (error) {
      console.error('Failed to load payments:', error);
      setPayments([]); // Set empty array for stub behavior
    }
  }, []);

  const loadDisputes = useCallback(async () => {
    try {
      const result = await trpc.getAllDisputes.query();
      setDisputes(result);
    } catch (error) {
      console.error('Failed to load disputes:', error);
      setDisputes([]); // Set empty array for stub behavior
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadCitizens(), loadPayments(), loadDisputes()])
      .finally(() => setIsLoading(false));
  }, [loadCitizens, loadPayments, loadDisputes]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Calculate dashboard stats
  const totalCitizens = citizens.length;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentMonthPayments = payments.filter((p: Payment) => 
    p.month === currentMonth && p.year === currentYear
  );
  const totalCurrentMonthRevenue = currentMonthPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
  const pendingDisputes = disputes.filter((d: Dispute) => d.status === 'pending').length;

  const filteredCitizens = citizens.filter((citizen: User) =>
    citizen.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    citizen.nik.includes(searchTerm) ||
    citizen.rt.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <span className="mr-2">👨‍💼</span>
            Dashboard Admin Kelurahan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Selamat datang, <span className="font-medium">{currentUser.full_name}</span>. 
            Kelola data warga, pencatatan pembayaran, dan tangani sengketa dari dashboard ini.
          </p>
        </CardContent>
      </Card>

      {/* Dashboard Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="w-4 h-4 mr-2 text-blue-600" />
              Total Warga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700">{totalCitizens}</p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-green-600" />
              Pemasukan Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">{formatRupiah(totalCurrentMonthRevenue)}</p>
            <p className="text-sm text-green-600">{currentMonthPayments.length} pembayaran</p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
              Sengketa Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-700">{pendingDisputes}</p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <FileText className="w-4 h-4 mr-2 text-purple-600" />
              Total Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-700">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Cari warga berdasarkan nama, NIK, atau RT..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stub Notification */}
      {!isLoading && totalCitizens === 0 && payments.length === 0 && disputes.length === 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-700">
            <strong>ℹ️ Mode Demo:</strong> Tidak ada data karena backend masih menggunakan stub handlers. 
            Semua fitur frontend sudah siap untuk integrasi dengan database sesungguhnya.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Management Tabs */}
      <Tabs defaultValue="citizens" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="citizens">Kelola Warga</TabsTrigger>
          <TabsTrigger value="payments">Kelola Pembayaran</TabsTrigger>
          <TabsTrigger value="disputes">Kelola Sengketa</TabsTrigger>
        </TabsList>

        <TabsContent value="citizens">
          <CitizenManagement 
            citizens={filteredCitizens}
            onDataUpdate={loadCitizens}
            isLoading={isLoading}
            currentAdmin={currentUser}
          />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentManagement
            payments={payments}
            citizens={citizens}
            onDataUpdate={loadPayments}
            currentAdmin={currentUser}
          />
        </TabsContent>

        <TabsContent value="disputes">
          <DisputeManagement
            disputes={disputes}
            payments={payments}
            citizens={citizens}
            onDataUpdate={loadDisputes}
            currentAdmin={currentUser}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}