import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pencil, UserPlus, MapPin, Users } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types
import type { User, CreateUserInput, UpdateUserInput } from '../../../server/src/schema';

interface CitizenManagementProps {
  citizens: User[];
  onDataUpdate: () => Promise<void>;
  isLoading: boolean;
  currentAdmin: User;
}

export function CitizenManagement({ citizens, onDataUpdate, isLoading, currentAdmin }: CitizenManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCitizen, setEditingCitizen] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    password: '',
    role: 'warga',
    full_name: '',
    nik: '',
    no_kk: '',
    home_address: '',
    rt: ''
  });

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'warga',
      full_name: '',
      nik: '',
      no_kk: '',
      home_address: '',
      rt: ''
    });
    setError(null);
  };

  const handleAddCitizen = () => {
    resetForm();
    setShowAddForm(true);
    setEditingCitizen(null);
  };

  const handleEditCitizen = (citizen: User) => {
    setFormData({
      username: citizen.username,
      password: '', // Don't prefill password for security
      role: citizen.role,
      full_name: citizen.full_name,
      nik: citizen.nik,
      no_kk: citizen.no_kk,
      home_address: citizen.home_address,
      rt: citizen.rt
    });
    setEditingCitizen(citizen);
    setShowAddForm(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.nik.trim() || !formData.rt.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingCitizen) {
        // Update existing citizen
        const updateData: UpdateUserInput = {
          id: editingCitizen.id,
          full_name: formData.full_name,
          nik: formData.nik,
          no_kk: formData.no_kk,
          home_address: formData.home_address,
          rt: formData.rt
        };
        await trpc.updateUser.mutate(updateData);
      } else {
        // Create new citizen
        await trpc.createUser.mutate(formData);
      }
      
      setShowAddForm(false);
      setEditingCitizen(null);
      await onDataUpdate();
      resetForm();
    } catch (error) {
      console.error('Failed to save citizen:', error);
      setError('Gagal menyimpan data warga. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingCitizen(null);
    resetForm();
  };

  const validateNIK = (nik: string) => {
    return nik.length === 16 && /^\d{16}$/.test(nik);
  };

  const validateRT = (rt: string) => {
    return /^00\d{1,2}$/.test(rt);
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Kelola Data Warga
            </CardTitle>
            <Button onClick={handleAddCitizen} className="bg-green-600 hover:bg-green-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Tambah Warga
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Citizens List */}
      <div className="grid gap-4">
        {citizens.length === 0 && !isLoading ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <p>Belum ada data warga. Klik "Tambah Warga" untuk menambahkan data baru.</p>
            </CardContent>
          </Card>
        ) : (
          citizens.map((citizen: User) => (
            <Card key={citizen.id} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold">{citizen.full_name}</h3>
                      <Badge variant="outline" className="text-blue-700 border-blue-300">
                        <MapPin className="w-3 h-3 mr-1" />
                        RT {citizen.rt}
                      </Badge>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <p><span className="font-medium">NIK:</span> {citizen.nik}</p>
                      <p><span className="font-medium">No. KK:</span> {citizen.no_kk}</p>
                      <p><span className="font-medium">Username:</span> {citizen.username}</p>
                      <p><span className="font-medium">Alamat:</span> {citizen.home_address}</p>
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-2">
                      Terdaftar: {new Date(citizen.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditCitizen(citizen)}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Form Dialog */}
      {showAddForm && (
        <Dialog open={true} onOpenChange={handleCancel}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCitizen ? 'Edit Data Warga' : 'Tambah Warga Baru'}
              </DialogTitle>
            </DialogHeader>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nama Lengkap *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, full_name: e.target.value }))
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rt">RT *</Label>
                  <Input
                    id="rt"
                    value={formData.rt}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, rt: e.target.value }))
                    }
                    placeholder="001, 002, 025, dst"
                    pattern="^00\d{1,2}$"
                    required
                    disabled={isSubmitting}
                  />
                  {formData.rt && !validateRT(formData.rt) && (
                    <p className="text-xs text-red-600">Format RT harus 00X atau 00XX (contoh: 001, 025)</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nik">NIK (16 digit) *</Label>
                  <Input
                    id="nik"
                    value={formData.nik}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, nik: e.target.value }))
                    }
                    maxLength={16}
                    pattern="\d{16}"
                    required
                    disabled={isSubmitting}
                  />
                  {formData.nik && !validateNIK(formData.nik) && (
                    <p className="text-xs text-red-600">NIK harus 16 digit angka</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="no_kk">No. KK (16 digit) *</Label>
                  <Input
                    id="no_kk"
                    value={formData.no_kk}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, no_kk: e.target.value }))
                    }
                    maxLength={16}
                    pattern="\d{16}"
                    required
                    disabled={isSubmitting}
                  />
                  {formData.no_kk && formData.no_kk.length > 0 && !validateNIK(formData.no_kk) && (
                    <p className="text-xs text-red-600">No. KK harus 16 digit angka</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="home_address">Alamat Rumah *</Label>
                <Input
                  id="home_address"
                  value={formData.home_address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, home_address: e.target.value }))
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>

              {!editingCitizen && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                        }
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                        }
                        required
                        disabled={isSubmitting}
                        minLength={6}
                      />
                    </div>
                  </div>
                </>
              )}
            </form>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Batal
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.full_name.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? 'Menyimpan...' : editingCitizen ? 'Perbarui' : 'Tambah'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}