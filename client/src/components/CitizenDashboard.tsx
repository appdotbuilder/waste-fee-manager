import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { DisputeForm } from '@/components/DisputeForm';

// Import types
import type { User, Payment, Dispute } from '../../../server/src/schema';

interface CitizenDashboardProps {
  currentUser: User;
}

export function CitizenDashboard({ currentUser }: CitizenDashboardProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState<number | null>(null);

  // Load user payments
  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await trpc.getUserPayments.query({
        user_id: currentUser.id,
        year: parseInt(selectedYear),
        month: selectedMonth ? parseInt(selectedMonth) : undefined
      });
      setPayments(result);
    } catch (error) {
      console.error('Failed to load payments:', error);
      setError('Gagal memuat data pembayaran');
      setPayments([]); // Set empty array for stub behavior
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, selectedYear, selectedMonth]);

  // Load user disputes
  const loadDisputes = useCallback(async () => {
    try {
      const result = await trpc.getUserDisputes.query({
        user_id: currentUser.id
      });
      setDisputes(result);
    } catch (error) {
      console.error('Failed to load disputes:', error);
      setDisputes([]); // Set empty array for stub behavior
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const handleDisputeSubmit = async (paymentId: number, reason: string, evidenceUrl: string | null) => {
    try {
      await trpc.createDispute.mutate({
        payment_id: paymentId,
        user_id: currentUser.id,
        dispute_reason: reason,
        evidence_photo_url: evidenceUrl
      });
      
      setShowDisputeForm(null);
      loadDisputes(); // Reload disputes
      
      // Show success message (you could use a toast library here)
      alert('Pengajuan sengketa berhasil disubmit');
    } catch (error) {
      console.error('Failed to create dispute:', error);
      alert('Gagal mengajukan sengketa. Silakan coba lagi.');
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getMonthName = (month: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month - 1];
  };

  const getDisputeStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Menunggu</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Disetujui</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-700 border-red-300"><AlertTriangle className="w-3 h-3 mr-1" />Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate payment summary
  const totalPaid = payments.reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentYearPayments = payments.filter((p: Payment) => p.year === currentYear);

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <span className="mr-2">👤</span>
            Informasi Warga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p><span className="font-medium">Nama:</span> {currentUser.full_name}</p>
              <p><span className="font-medium">NIK:</span> {currentUser.nik}</p>
              <p><span className="font-medium">No. KK:</span> {currentUser.no_kk}</p>
            </div>
            <div>
              <p><span className="font-medium">RT:</span> {currentUser.rt}</p>
              <p><span className="font-medium">Alamat:</span> {currentUser.home_address}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-blue-600" />
              Total Dibayar {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700">{formatRupiah(totalPaid)}</p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Bulan Terbayar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">{currentYearPayments.length} bulan</p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
              Sengketa Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-700">
              {disputes.filter((d: Dispute) => d.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payments">Riwayat Pembayaran</TabsTrigger>
          <TabsTrigger value="disputes">Sengketa</TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {/* Filter Controls */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tahun</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2023, 2022].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bulan</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Semua bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Semua bulan</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {getMonthName(month)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={loadPayments} disabled={isLoading}>
                  {isLoading ? 'Memuat...' : 'Filter'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Stub notification */}
          {!isLoading && payments.length === 0 && !error && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-700">
                <strong>ℹ️ Mode Demo:</strong> Tidak ada data pembayaran karena backend masih menggunakan stub data. 
                Fitur frontend sudah siap untuk integrasi dengan database sesungguhnya.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            {payments.map((payment: Payment) => (
              <Card key={payment.id} className="border-l-4 border-l-green-500">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          {getMonthName(payment.month)} {payment.year}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Dibayar: {formatDate(payment.payment_date)}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-green-700 mb-2">
                        {formatRupiah(payment.amount)}
                      </p>
                      {payment.receipt_photo_url && (
                        <p className="text-sm text-gray-600">
                          📸 Foto bukti tersedia
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      {payment.receipt_photo_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(payment.receipt_photo_url!, '_blank')}
                        >
                          Lihat Bukti
                        </Button>
                      )}
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDisputeForm(payment.id)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          Ajukan Sengketa
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="space-y-4">
          {/* Stub notification */}
          {disputes.length === 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-700">
                <strong>ℹ️ Mode Demo:</strong> Tidak ada data sengketa karena backend masih menggunakan stub data. 
                Fitur frontend sudah siap untuk integrasi dengan database sesungguhnya.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            {disputes.map((dispute: Dispute) => (
              <Card key={dispute.id} className="border-l-4 border-l-orange-500">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getDisputeStatusBadge(dispute.status)}
                        <span className="text-sm text-gray-500">
                          Diajukan: {formatDate(dispute.created_at)}
                        </span>
                      </div>
                      <p className="font-medium mb-2">Alasan Sengketa:</p>
                      <p className="text-gray-700 mb-3">{dispute.dispute_reason}</p>
                      
                      {dispute.admin_response && (
                        <>
                          <p className="font-medium mb-1">Tanggapan Admin:</p>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded">
                            {dispute.admin_response}
                          </p>
                        </>
                      )}
                    </div>
                    {dispute.evidence_photo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(dispute.evidence_photo_url!, '_blank')}
                      >
                        Lihat Bukti
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dispute Form Modal */}
      {showDisputeForm && (
        <DisputeForm
          paymentId={showDisputeForm}
          onSubmit={handleDisputeSubmit}
          onCancel={() => setShowDisputeForm(null)}
        />
      )}
    </div>
  );
}