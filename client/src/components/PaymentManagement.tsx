import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Calendar, DollarSign, User as UserIcon, Pencil, Image } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types
import type { User, Payment, CreatePaymentInput, UpdatePaymentInput } from '../../../server/src/schema';

interface PaymentManagementProps {
  payments: Payment[];
  citizens: User[];
  onDataUpdate: () => Promise<void>;
  currentAdmin: User;
}

export function PaymentManagement({ payments, citizens, onDataUpdate, currentAdmin }: PaymentManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const [formData, setFormData] = useState<CreatePaymentInput>({
    user_id: 0,
    amount: 0,
    payment_date: new Date(),
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    receipt_photo_url: null,
    recorded_by_admin_id: currentAdmin.id
  });

  const resetForm = () => {
    const now = new Date();
    setFormData({
      user_id: 0,
      amount: 0,
      payment_date: now,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      receipt_photo_url: null,
      recorded_by_admin_id: currentAdmin.id
    });
    setError(null);
  };

  const handleAddPayment = () => {
    resetForm();
    setShowAddForm(true);
    setEditingPayment(null);
  };

  const handleEditPayment = (payment: Payment) => {
    setFormData({
      user_id: payment.user_id,
      amount: payment.amount,
      payment_date: new Date(payment.payment_date),
      month: payment.month,
      year: payment.year,
      receipt_photo_url: payment.receipt_photo_url,
      recorded_by_admin_id: currentAdmin.id
    });
    setEditingPayment(payment);
    setShowAddForm(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.amount || !formData.payment_date) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingPayment) {
        // Update existing payment
        const updateData: UpdatePaymentInput = {
          id: editingPayment.id,
          amount: formData.amount,
          payment_date: formData.payment_date,
          month: formData.month,
          year: formData.year,
          receipt_photo_url: formData.receipt_photo_url
        };
        await trpc.updatePayment.mutate(updateData);
      } else {
        // Create new payment
        await trpc.createPayment.mutate(formData);
      }
      
      setShowAddForm(false);
      setEditingPayment(null);
      await onDataUpdate();
      resetForm();
    } catch (error) {
      console.error('Failed to save payment:', error);
      setError('Gagal menyimpan data pembayaran. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingPayment(null);
    resetForm();
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

  const getCitizenName = (userId: number) => {
    const citizen = citizens.find((c) => c.id === userId);
    return citizen ? citizen.full_name : `User ID: ${userId}`;
  };

  const getCitizenRT = (userId: number) => {
    const citizen = citizens.find((c) => c.id === userId);
    return citizen ? citizen.rt : '-';
  };

  // Filter payments
  const filteredPayments = payments.filter((payment: Payment) => {
    const yearMatch = !selectedYear || payment.year === parseInt(selectedYear);
    const monthMatch = !selectedMonth || payment.month === parseInt(selectedMonth);
    return yearMatch && monthMatch;
  });

  return (
    <div className="space-y-4">
      {/* Header with Add Button and Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Kelola Pembayaran Iuran
            </CardTitle>
            <Button onClick={handleAddPayment} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Catat Pembayaran
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Filter Tahun</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua</SelectItem>
                  {[2024, 2023, 2022].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Filter Bulan</Label>
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
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <div className="grid gap-4">
        {filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <p>
                {payments.length === 0 
                  ? 'Belum ada catatan pembayaran. Klik "Catat Pembayaran" untuk menambahkan data baru.'
                  : 'Tidak ada pembayaran sesuai filter yang dipilih.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPayments.map((payment: Payment) => (
            <Card key={payment.id} className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        <Calendar className="w-3 h-3 mr-1" />
                        {getMonthName(payment.month)} {payment.year}
                      </Badge>
                      <Badge variant="outline" className="text-blue-700 border-blue-300">
                        <UserIcon className="w-3 h-3 mr-1" />
                        {getCitizenName(payment.user_id)} (RT {getCitizenRT(payment.user_id)})
                      </Badge>
                    </div>
                    
                    <div className="mb-2">
                      <p className="text-2xl font-bold text-green-700 mb-1">
                        {formatRupiah(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Tanggal Bayar:</span> {formatDate(payment.payment_date)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {payment.receipt_photo_url && (
                        <span className="flex items-center">
                          <Image className="w-3 h-3 mr-1" />
                          Foto bukti tersedia
                        </span>
                      )}
                      <span>
                        Dicatat: {new Date(payment.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {payment.receipt_photo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(payment.receipt_photo_url!, '_blank')}
                      >
                        <Image className="w-4 h-4 mr-1" />
                        Lihat Bukti
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPayment(payment)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Payment Dialog */}
      {showAddForm && (
        <Dialog open={true} onOpenChange={handleCancel}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPayment ? 'Edit Pembayaran' : 'Catat Pembayaran Baru'}
              </DialogTitle>
            </DialogHeader>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user_id">Pilih Warga *</Label>
                <Select 
                  value={formData.user_id.toString()} 
                  onValueChange={(value: string) => 
                    setFormData((prev: CreatePaymentInput) => ({ ...prev, user_id: parseInt(value) }))
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih warga" />
                  </SelectTrigger>
                  <SelectContent>
                    {citizens.map((citizen) => (
                      <SelectItem key={citizen.id} value={citizen.id.toString()}>
                        {citizen.full_name} (RT {citizen.rt})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Jumlah Bayar (Rp) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePaymentInput) => ({ ...prev, amount: parseInt(e.target.value) || 0 }))
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment_date">Tanggal Bayar *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePaymentInput) => ({ ...prev, payment_date: new Date(e.target.value) }))
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Bulan Iuran *</Label>
                  <Select 
                    value={formData.month.toString()} 
                    onValueChange={(value: string) => 
                      setFormData((prev: CreatePaymentInput) => ({ ...prev, month: parseInt(value) }))
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {getMonthName(month)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="year">Tahun *</Label>
                  <Select 
                    value={formData.year.toString()} 
                    onValueChange={(value: string) => 
                      setFormData((prev: CreatePaymentInput) => ({ ...prev, year: parseInt(value) }))
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2023, 2022, 2021, 2020].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt_photo_url">URL Foto Bukti (Opsional)</Label>
                <Input
                  id="receipt_photo_url"
                  type="url"
                  value={formData.receipt_photo_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreatePaymentInput) => ({ 
                      ...prev, 
                      receipt_photo_url: e.target.value || null 
                    }))
                  }
                  placeholder="https://example.com/foto-struk.jpg"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-600">
                  Masukkan link foto struk/bukti pembayaran (dari cloud storage, dll)
                </p>
              </div>
            </form>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Batal
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.user_id || !formData.amount}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Menyimpan...' : editingPayment ? 'Perbarui' : 'Catat Pembayaran'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}