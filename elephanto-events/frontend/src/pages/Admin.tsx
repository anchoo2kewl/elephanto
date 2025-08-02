import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { adminAPI } from '@/services/api';
import { User } from '@/types';
import { Shield, Users, Calendar, Database, ChevronDown } from 'lucide-react';

export const Admin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersResponse, migrationResponse] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getMigrationStatus(),
      ]);
      setUsers(usersResponse.data);
      setMigrationStatus(migrationResponse.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await adminAPI.updateUserRole(userId, { role: newRole });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      setSelectedUser('');
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const stats = [
    { label: 'Total Users', value: users.length.toString(), icon: Users },
    { label: 'Admin Users', value: users.filter(u => u.role === 'admin').length.toString(), icon: Shield },
    { label: 'Onboarded Users', value: users.filter(u => u.isOnboarded).length.toString(), icon: Calendar },
    { label: 'DB Version', value: migrationStatus?.version?.toString() || '0', icon: Database },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <GlassCard variant="elevated" className="p-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Admin Dashboard 👑
        </h1>
        <p className="text-white/80">
          Manage users and system settings
        </p>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <GlassCard key={label} className="p-4 text-center">
            <Icon className="h-8 w-8 text-white/80 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-white/70 text-sm">{label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Database Status */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Database Status 🗄️
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-white/70 text-sm">Migration Version</div>
            <div className="text-white font-medium text-lg">
              {migrationStatus?.version || 'No migrations'}
            </div>
          </div>
          <div>
            <div className="text-white/70 text-sm">Status</div>
            <div className="text-white font-medium text-lg">
              {migrationStatus?.dirty ? '❌ Dirty' : '✅ Clean'}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* User Management */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-6">
          User Management 👥
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left text-white/80 py-3 px-2">User</th>
                <th className="text-left text-white/80 py-3 px-2">Role</th>
                <th className="text-left text-white/80 py-3 px-2">Status</th>
                <th className="text-left text-white/80 py-3 px-2">Joined</th>
                <th className="text-left text-white/80 py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/10">
                  <td className="py-4 px-2">
                    <div>
                      <div className="text-white font-medium">
                        {user.name || 'No name'}
                      </div>
                      <div className="text-white/60 text-sm">{user.email}</div>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-200'
                        : 'bg-blue-500/20 text-blue-200'
                    }`}>
                      {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isOnboarded
                        ? 'bg-green-500/20 text-green-200'
                        : 'bg-yellow-500/20 text-yellow-200'
                    }`}>
                      {user.isOnboarded ? '✅ Complete' : '⏳ Pending'}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-white/70 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-2">
                    <div className="relative">
                      <button
                        onClick={() => setSelectedUser(selectedUser === user.id ? '' : user.id)}
                        className="flex items-center space-x-1 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-all duration-200"
                      >
                        <span>Change Role</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      
                      {selectedUser === user.id && (
                        <div className="absolute top-full left-0 mt-1 w-32 bg-black/50 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden z-10">
                          <button
                            onClick={() => handleRoleUpdate(user.id, 'user')}
                            className="w-full px-3 py-2 text-left text-white hover:bg-white/20 transition-colors duration-200"
                            disabled={user.role === 'user'}
                          >
                            👤 User
                          </button>
                          <button
                            onClick={() => handleRoleUpdate(user.id, 'admin')}
                            className="w-full px-3 py-2 text-left text-white hover:bg-white/20 transition-colors duration-200"
                            disabled={user.role === 'admin'}
                          >
                            👑 Admin
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};