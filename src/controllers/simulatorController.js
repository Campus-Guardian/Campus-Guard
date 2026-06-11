const supabase = require('../config/supabase');

// Precomputed bcrypt hash for 'test123' to speed up bulk generation
const TEST_PASSWORD_HASH = '$2a$10$JOspvefD8KZk4abF/srJset96uRzUbBUqI/OGZzFoti11y57XKCHG';

// BTU Campus boundary defaults for coordinate generation
const MIN_LAT = 40.186121;
const MAX_LAT = 40.191767;
const MIN_LNG = 29.125768;
const MAX_LNG = 29.136281;

// Generate N random test devices & users
exports.generateTestData = async (req, res) => {
  try {
    const count = parseInt(req.body.count) || 5;
    if (count < 1 || count > 100) {
      return res.status(400).json({ error: 'Cihaz sayısı 1 ile 100 arasında olmalıdır' });
    }

    const generatedUsers = [];
    const generatedDevices = [];

    for (let i = 0; i < count; i++) {
      const randNum = Math.floor(10000 + Math.random() * 90000);
      const studentId = `TEST${randNum}`;
      
      // 1. Create student user
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          email: `test_student_${randNum}@btu.edu.tr`,
          student_id: studentId,
          password_hash: TEST_PASSWORD_HASH,
          full_name: `Test Öğrenci ${randNum}`,
          role: 'user',
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        console.error('Failed to create test user:', userError);
        continue;
      }

      // 2. Create device
      const randomLat = MIN_LAT + Math.random() * (MAX_LAT - MIN_LAT);
      const randomLng = MIN_LNG + Math.random() * (MAX_LNG - MIN_LNG);
      const platformOptions = ['Android', 'iOS', 'Web'];
      const randomPlatform = platformOptions[Math.floor(Math.random() * platformOptions.length)];

      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .insert({
          user_id: user.id,
          device_name: `Test Cihaz ${randNum}`,
          device_type: 'smartphone',
          platform: randomPlatform,
          is_active: true,
          last_seen: new Date().toISOString(),
          last_latitude: parseFloat(randomLat.toFixed(6)),
          last_longitude: parseFloat(randomLng.toFixed(6))
        })
        .select()
        .single();

      if (deviceError) {
        console.error('Failed to create test device:', deviceError);
        continue;
      }

      generatedUsers.push(user);
      generatedDevices.push(device);
    }

    res.status(201).json({
      message: `${generatedDevices.length} test cihazı başarıyla oluşturuldu`,
      devices: generatedDevices
    });
  } catch (err) {
    console.error('Bulk generate test data error:', err);
    res.status(500).json({ error: 'Test verisi oluşturulamadı' });
  }
};

// Cleanup all TEST students and their devices/alerts/sensors (via cascade delete)
exports.cleanupTestData = async (req, res) => {
  try {
    // We select users starting with student_id = 'TEST%'
    const { data: testUsers, error: selectError } = await supabase
      .from('users')
      .select('id')
      .like('student_id', 'TEST%');

    if (selectError) throw selectError;

    if (!testUsers || testUsers.length === 0) {
      return res.json({ message: 'Temizlenecek test verisi bulunamadı', deletedCount: 0 });
    }

    const testUserIds = testUsers.map(u => u.id);

    // Delete users. The references in devices (ON DELETE CASCADE) and other tables will be deleted automatically by Supabase.
    // If not, we can delete them explicitly.
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .in('id', testUserIds);

    if (deleteError) throw deleteError;

    res.json({
      message: `${testUserIds.length} test öğrencisi ve ilişkili tüm veriler temizlendi.`,
      deletedCount: testUserIds.length
    });
  } catch (err) {
    console.error('Cleanup test data error:', err);
    res.status(500).json({ error: 'Test verileri temizlenirken hata oluştu' });
  }
};
