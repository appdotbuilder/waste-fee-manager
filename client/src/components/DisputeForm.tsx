import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DisputeFormProps {
  paymentId: number;
  onSubmit: (paymentId: number, reason: string, evidenceUrl: string | null) => Promise<void>;
  onCancel: () => void;
}

export function DisputeForm({ paymentId, onSubmit, onCancel }: DisputeFormProps) {
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(paymentId, reason.trim(), evidenceUrl.trim() || null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="mr-2">⚠️</span>
            Ajukan Sengketa Pembayaran
          </DialogTitle>
        </DialogHeader>
        
        <Alert className="border-orange-200 bg-orange-50">
          <AlertDescription className="text-orange-700">
            Gunakan fitur ini jika Anda merasa ada kesalahan dalam pencatatan pembayaran Anda.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan Sengketa *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              placeholder="Jelaskan mengapa Anda mengajukan sengketa untuk pembayaran ini..."
              required
              rows={4}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="evidence">URL Foto Bukti (Opsional)</Label>
            <Input
              id="evidence"
              type="url"
              value={evidenceUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEvidenceUrl(e.target.value)}
              placeholder="https://example.com/foto-bukti.jpg"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-600">
              Masukkan link foto bukti pembayaran jika tersedia (contoh: dari Google Drive, cloud storage, dll)
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? 'Mengajukan...' : 'Ajukan Sengketa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}