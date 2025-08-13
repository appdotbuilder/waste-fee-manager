import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, User as UserIcon, Calendar, DollarSign, MessageSquare, Image } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types
import type { User, Payment, Dispute, ResolveDisputeInput, DisputeStatus } from '../../../server/src/schema';

interface DisputeManagementProps {
  disputes: Dispute[];
  payments: Payment[];
  citizens: User[];
  onDataUpdate: () => Promise<void>;
  currentAdmin: User;
}

export function DisputeManagement({ disputes, payments, citizens, onDataUpdate, currentAdmin }: DisputeManagementProps) {
  const [resolvingDispute, setResolvingDispute] = useState<Dispute | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DisputeStatus>('approved');
  const [adminResponse, setAdminResponse] = useState('');

  const handleResolveDispute = (dispute: Dispute) => {
    setResolvingDispute(dispute);
    setSelectedStatus('approved');
    setAdminResponse('');
    setError(null);
  };

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingDispute) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const resolveData: ResolveDisputeInput = {
        id: resolvingDispute.id,
        status: selectedStatus,
        admin_response: adminResponse.trim() || null,
        resolved_by_admin_id: currentAdmin.id
      };
      
      await trpc.resolveDispute.mutate(resolveData);
      
      setResolvingDispute(null);
      await onDataUpdate();
      setAdminResponse('');
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
      setError('Gagal menyelesaikan sengketa. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setResolvingDispute(null);
    setAdminResponse('');
    setError(null);
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

  const getCitizenName = (userId: number) => {
    const citizen = citizens.find((c) => c.id === userId);
    return citizen ? citizen.full_name : `User ID: ${userId}`;
  };

  const getCitizenRT = (userId: number) => {
    const citizen = citizens.find((c) => c.id === userId);
    return citizen ? citizen.rt : '-';
  };

  const getPaymentInfo = (paymentId: number) => {
    const payment = payments.find((p: Payment) => p.id === paymentId);
    return payment ? {
      amount: payment.amount,
      month: payment.month,
      year: payment.year,
      date: payment.payment_date
    } : null;
  };

  // Separate disputes by status
  const pendingDisputes = disputes.filter((d: Dispute) => d.status === 'pending');
  const resolvedDisputes = disputes.filter((d: Dispute) => d.status !== 'pending');

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Kelola Sengketa Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span><strong>{pendingDisputes.length}</strong> sengketa menunggu</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span><strong>{disputes.filter((d: Dispute) => d.status === 'approved').length}</strong> disetujui</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span><strong>{disputes.filter((d: Dispute) => d.status === 'rejected').length}</strong> ditolak</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disputes organized by tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            Menunggu ({pendingDisputes.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Telah Diselesaikan ({resolvedDisputes.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Disputes */}
        <TabsContent value="pending" className="space-y-4">
          {pendingDisputes.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                <p>Tidak ada sengketa yang menunggu penyelesaian.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingDisputes.map((dispute: Dispute) => {
                const paymentInfo = getPaymentInfo(dispute.payment_id);
                return (
                  <Card key={dispute.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-3">
                            {getDisputeStatusBadge(dispute.status)}
                            <Badge variant="outline" className="text-blue-700 border-blue-300">
                              <UserIcon className="w-3 h-3 mr-1" />
                              {getCitizenName(dispute.user_id)} (RT {getCitizenRT(dispute.user_id)})
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatDate(dispute.created_at)}
                            </span>
                          </div>
                          
                          {paymentInfo && (
                            <div className="bg-gray-50 p-3 rounded mb-3">
                              <p className="font-medium text-sm mb-1">Detail Pembayaran:</p>
                              <div className="grid md:grid-cols-3 gap-2 text-sm text-gray-600">
                                <span>
                                  <DollarSign className="w-3 h-3 inline mr-1" />
                                  {formatRupiah(paymentInfo.amount)}
                                </span>
                                <span>
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {getMonthName(paymentInfo.month)} {paymentInfo.year}
                                </span>
                                <span>
                                  Dibayar: {formatDate(paymentInfo.date)}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className="mb-3">
                            <p className="font-medium text-sm mb-1">Alasan Sengketa:</p>
                            <p className="text-gray-700 text-sm bg-red-50 p-3 rounded">
                              {dispute.dispute_reason}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2 ml-4">
                          {dispute.evidence_photo_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(dispute.evidence_photo_url!, '_blank')}
                            >
                              <Image className="w-4 h-4 mr-1" />
                              Lihat Bukti
                            </Button>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleResolveDispute(dispute)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Tanggapi
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Resolved Disputes */}
        <TabsContent value="resolved" className="space-y-4">
          {resolvedDisputes.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                <p>Belum ada sengketa yang diselesaikan.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {resolvedDisputes.map((dispute: Dispute) => {
                const paymentInfo = getPaymentInfo(dispute.payment_id);
                return (
                  <Card key={dispute.id} className={`border-l-4 ${dispute.status === 'approved' ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-3">
                            {getDisputeStatusBadge(dispute.status)}
                            <Badge variant="outline" className="text-blue-700 border-blue-300">
                              <UserIcon className="w-3 h-3 mr-1" />
                              {getCitizenName(dispute.user_id)} (RT {getCitizenRT(dispute.user_id)})
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Diselesaikan: {formatDate(dispute.updated_at)}
                            </span>
                          </div>
                          
                          {paymentInfo && (
                            <div className="bg-gray-50 p-3 rounded mb-3">
                              <p className="font-medium text-sm mb-1">Detail Pembayaran:</p>
                              <div className="grid md:grid-cols-3 gap-2 text-sm text-gray-600">
                                <span>
                                  <DollarSign className="w-3 h-3 inline mr-1" />
                                  {formatRupiah(paymentInfo.amount)}
                                </span>
                                <span>
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {getMonthName(paymentInfo.month)} {paymentInfo.year}
                                </span>
                                <span>
                                  Dibayar: {formatDate(paymentInfo.date)}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className="grid md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="font-medium text-sm mb-1">Alasan Sengketa:</p>
                              <p className="text-gray-700 text-sm bg-red-50 p-3 rounded">
                                {dispute.dispute_reason}
                              </p>
                            </div>
                            
                            {dispute.admin_response && (
                              <div>
                                <p className="font-medium text-sm mb-1">Tanggapan Admin:</p>
                                <p className={`text-sm p-3 rounded ${
                                  dispute.status === 'approved' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                }`}>
                                  {dispute.admin_response}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {dispute.evidence_photo_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(dispute.evidence_photo_url!, '_blank')}
                            >
                              <Image className="w-4 h-4 mr-1" />
                              Lihat Bukti
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Resolve Dispute Dialog */}
      {resolvingDispute && (
        <Dialog open={true} onOpenChange={handleCancel}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tanggapi Sengketa</DialogTitle>
            </DialogHeader>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium text-sm mb-1">Sengketa dari:</p>
                <p className="text-sm">{getCitizenName(resolvingDispute.user_id)} (RT {getCitizenRT(resolvingDispute.user_id)})</p>
                <p className="font-medium text-sm mt-2 mb-1">Alasan:</p>
                <p className="text-sm text-gray-700">{resolvingDispute.dispute_reason}</p>
              </div>

              <form onSubmit={handleSubmitResolution} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Keputusan *</Label>
                  <Select 
                    value={selectedStatus} 
                    onValueChange={(value: DisputeStatus) => setSelectedStatus(value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                          Setujui Sengketa
                        </div>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                          Tolak Sengketa
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_response">Tanggapan (Opsional)</Label>
                  <Textarea
                    id="admin_response"
                    value={adminResponse}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminResponse(e.target.value)}
                    placeholder="Berikan penjelasan mengenai keputusan ini..."
                    rows={4}
                    disabled={isSubmitting}
                  />
                </div>
              </form>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Batal
              </Button>
              <Button
                type="submit"
                onClick={handleSubmitResolution}
                disabled={isSubmitting}
                className={selectedStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {isSubmitting ? 'Memproses...' : `${selectedStatus === 'approved' ? 'Setujui' : 'Tolak'} Sengketa`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}