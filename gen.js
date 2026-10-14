// gen.js: builds every Dart file for one entity, split into parts with a Thai note each.
// Entity-specific text is wrapped in \u0001...\u0002 so the page can highlight it.
(function (root) {
  const A = '\u0001', B = '\u0002';
  const E = s => A + s + B;
  const strip = s => s.replace(/[\u0001\u0002]/g, '');

  const TYPES = {
    String:   { sql: 'TEXT',    to: f => f,                        from: f => `map['${f}'] as String`,                  input: 'text' },
    int:      { sql: 'INTEGER', to: f => f,                        from: f => `map['${f}'] as int`,                     input: 'int' },
    double:   { sql: 'REAL',    to: f => f,                        from: f => `(map['${f}'] as num).toDouble()`,        input: 'double' },
    bool:     { sql: 'INTEGER', to: f => `${f} ? 1 : 0`,           from: f => `map['${f}'] == 1`,                       input: 'switch' },
    DateTime: { sql: 'TEXT',    to: f => `${f}.toIso8601String()`, from: f => `DateTime.parse(map['${f}'] as String)`, input: 'date' },
  };

  const ENTITIES = [
    { cls: 'Book', th: 'หนังสือ', fields: [['title', 'String', 'ชื่อเรื่อง'], ['author', 'String', 'ผู้แต่ง'], ['price', 'double', 'ราคา'], ['isRead', 'bool', 'อ่านแล้ว']] },
    { cls: 'Student', th: 'นิสิต', fields: [['name', 'String', 'ชื่อ'], ['studentId', 'String', 'รหัสนิสิต'], ['year', 'int', 'ชั้นปี'], ['gpa', 'double', 'เกรดเฉลี่ย']] },
    { cls: 'Movie', th: 'ภาพยนตร์', fields: [['title', 'String', 'ชื่อเรื่อง'], ['rating', 'double', 'คะแนน'], ['watched', 'bool', 'ดูแล้ว'], ['releaseDate', 'DateTime', 'วันที่เข้าฉาย']] },
    { cls: 'Product', th: 'สินค้า', fields: [['name', 'String', 'ชื่อสินค้า'], ['price', 'double', 'ราคา'], ['stock', 'int', 'จำนวนคงเหลือ']] },
    { cls: 'Pet', th: 'สัตว์เลี้ยง', fields: [['name', 'String', 'ชื่อ'], ['species', 'String', 'ชนิด'], ['age', 'int', 'อายุ'], ['vaccinated', 'bool', 'ฉีดวัคซีนแล้ว']] },
    { cls: 'Employee', th: 'พนักงาน', fields: [['name', 'String', 'ชื่อ'], ['position', 'String', 'ตำแหน่ง'], ['salary', 'double', 'เงินเดือน'], ['startDate', 'DateTime', 'วันเริ่มงาน']] },
    { cls: 'Car', th: 'รถยนต์', fields: [['brand', 'String', 'ยี่ห้อ'], ['model', 'String', 'รุ่น'], ['year', 'int', 'ปีที่ผลิต'], ['price', 'double', 'ราคา']] },
    { cls: 'Course', th: 'รายวิชา', fields: [['code', 'String', 'รหัสวิชา'], ['name', 'String', 'ชื่อวิชา'], ['credits', 'int', 'หน่วยกิต']] },
    { cls: 'Song', th: 'เพลง', fields: [['title', 'String', 'ชื่อเพลง'], ['artist', 'String', 'ศิลปิน'], ['durationSec', 'int', 'ความยาว (วินาที)'], ['favorite', 'bool', 'เพลงโปรด']] },
    { cls: 'Todo', th: 'งานที่ต้องทำ', fields: [['title', 'String', 'ชื่องาน'], ['done', 'bool', 'เสร็จแล้ว'], ['dueDate', 'DateTime', 'กำหนดส่ง']] },
    { cls: 'Contact', th: 'รายชื่อติดต่อ', fields: [['name', 'String', 'ชื่อ'], ['phone', 'String', 'เบอร์โทร'], ['email', 'String', 'อีเมล']] },
    { cls: 'Recipe', th: 'สูตรอาหาร', fields: [['name', 'String', 'ชื่อเมนู'], ['minutes', 'int', 'เวลาทำ (นาที)'], ['calories', 'double', 'แคลอรี่'], ['vegetarian', 'bool', 'มังสวิรัติ']] },
    { cls: 'Hotel', th: 'โรงแรม', fields: [['name', 'String', 'ชื่อโรงแรม'], ['city', 'String', 'เมือง'], ['stars', 'int', 'จำนวนดาว'], ['pricePerNight', 'double', 'ราคาต่อคืน']] },
    { cls: 'Workout', th: 'การออกกำลังกาย', fields: [['activity', 'String', 'กิจกรรม'], ['minutes', 'int', 'ระยะเวลา (นาที)'], ['date', 'DateTime', 'วันที่']] },
  ];

  // Class names that already exist in Flutter / sqflite / Dart and will clash.
  const CLASH = ['Transaction', 'Database', 'Batch', 'Card', 'Text', 'Table', 'Title', 'Route', 'Icon', 'Image', 'Container',
    'Element', 'Action', 'Intent', 'Step', 'Theme', 'Color', 'Key', 'State', 'Form', 'Map', 'List', 'Set', 'String', 'Object',
    'Type', 'Function', 'Size', 'Center', 'Row', 'Column', 'Banner', 'Chip', 'Tab', 'Page', 'Flow', 'Animation', 'Record',
    'Duration', 'DateTime', 'Category', 'Notification', 'Material', 'Scaffold', 'Divider', 'Placeholder', 'Tooltip', 'Radio',
    'Checkbox', 'Switch', 'Slider', 'Stack', 'Wrap', 'Padding', 'Align', 'Expanded', 'Spacer', 'Visibility', 'Opacity', 'Hero',
    'Navigator', 'Provider', 'Consumer', 'Selector', 'Locale', 'Path', 'Paint', 'Canvas', 'Shadow', 'Border', 'Gradient', 'Offset', 'Rect'];
  const KEYWORDS = ['id', 'class', 'new', 'default', 'switch', 'case', 'in', 'is', 'as', 'if', 'else', 'for', 'while', 'do', 'return',
    'var', 'final', 'const', 'void', 'null', 'true', 'false', 'this', 'super', 'enum', 'extends', 'with', 'import', 'try', 'catch',
    'throw', 'break', 'continue', 'late', 'required', 'static', 'get', 'set', 'map', 'context', 'provider', 'index', 'value', 'widget', 'mounted'];

  const lower = s => s[0].toLowerCase() + s.slice(1);
  const snake = s => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  const plural = s => /(s|x|z|ch|sh)$/.test(s) ? s + 'es' : /[^aeiou]y$/.test(s) ? s.slice(0, -1) + 'ies' : s + 's';
  const cap = s => s[0].toUpperCase() + s.slice(1);

  function names(ent) {
    const C = ent.cls, c = lower(C), P = plural(C), p = lower(P);
    return {
      C, c, P, p, th: ent.th,
      file: snake(C), table: snake(P), db: snake(P) + '.db',
      Prov: C + 'Provider', provFile: snake(C) + '_provider',
      List: C + 'ListScreen', listFile: snake(C) + '_list_screen',
      Form: C + 'FormScreen', formFile: snake(C) + '_form_screen',
      fetch: 'fetch' + P, add: 'add' + C, update: 'update' + C, del: 'delete' + C,
      fields: ent.fields.map(([name, type, label]) => ({ name, type, label: label || name, T: TYPES[type] })),
    };
  }

  function check(ent) {
    const errs = [];
    if (!/^[A-Z][A-Za-z0-9]*$/.test(ent.cls)) errs.push('ชื่อคลาสต้องขึ้นต้นด้วยตัวพิมพ์ใหญ่ และมีแค่ตัวอักษรอังกฤษกับตัวเลข เช่น Book, TodoItem');
    if (CLASH.includes(ent.cls)) errs.push(`ชื่อ ${ent.cls} มีคลาสนี้อยู่แล้วใน Flutter หรือ sqflite จะคอมไพล์ไม่ผ่าน ให้ตั้งชื่อใหม่ เช่น My${ent.cls} (แบบที่ปฏิบัติการบท 13 ใช้ MyTransaction)`);
    if (!ent.fields.length) errs.push('ต้องมีฟิลด์อย่างน้อย 1 ตัว');
    const seen = new Set();
    ent.fields.forEach(([n]) => {
      if (!/^[a-z][A-Za-z0-9]*$/.test(n)) errs.push(`ชื่อฟิลด์ "${n}" ต้องขึ้นต้นด้วยตัวพิมพ์เล็ก แบบ camelCase เช่น price, startDate`);
      else if (KEYWORDS.includes(n)) errs.push(`ชื่อฟิลด์ "${n}" ใช้ไม่ได้ เพราะเป็นคำสงวนหรือชื่อที่โค้ดใช้อยู่แล้ว`);
      if (seen.has(n)) errs.push(`ชื่อฟิลด์ "${n}" ซ้ำกัน`);
      seen.add(n);
    });
    return errs;
  }

  const ind = (s, n) => s.split('\n').map(l => l ? ' '.repeat(n) + l : l).join('\n');

  // ---------- model ----------
  function model(n) {
    const F = n.fields;
    return {
      path: `lib/models/${n.file}.dart`, key: 'model', title: 'Model',
      parts: [
        {
          code: `// lib/models/${E(n.file)}.dart
class ${E(n.C)} {
  final int? id; // null = ยังไม่เคยบันทึก ฐานข้อมูลจะเติมให้ตอน insert
${F.map(f => `  final ${E(f.type)} ${E(f.name)};`).join('\n')}`,
          note: `<p>Model คือแม่พิมพ์ของข้อมูล 1 รายการ ${n.th} หนึ่งรายการมีอะไรบ้าง ก็ประกาศเป็นตัวแปรไว้ตรงนี้</p>
<p><code>final</code> แปลว่าตั้งค่าครั้งเดียวแล้วเปลี่ยนไม่ได้ ถ้าจะแก้ข้อมูลเราจะสร้างออบเจกต์ใหม่แทน</p>
<p><code>int? id</code> มีเครื่องหมาย <code>?</code> แปลว่าเป็น null ได้ ตอนผู้ใช้กรอกฟอร์มเพิ่มของใหม่ยังไม่มี id เพราะ SQLite จะเป็นคนออกเลขให้ (AUTOINCREMENT)</p>`,
        },
        {
          code: `
  ${E(n.C)}({
    this.id,
${F.map(f => `    required this.${E(f.name)},`).join('\n')}
  });`,
          note: `<p>Constructor แบบ named parameter ตอนสร้างต้องเขียนชื่อกำกับ เช่น <code>${n.C}(${F[0].name}: ...)</code> อ่านง่ายและสลับลำดับได้</p>
<p><code>required</code> บังคับว่าต้องส่งค่ามา ส่วน <code>this.id</code> ไม่มี required เพราะตอนเพิ่มใหม่ยังไม่มี id</p>`,
        },
        {
          code: `

  // ออบเจกต์ → Map (ก่อนเขียนลงฐานข้อมูล)
  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
${F.map(f => `      '${E(f.name)}': ${E(f.T.to(f.name))},`).join('\n')}
    };
  }`,
          note: `<p>sqflite ไม่รู้จักคลาส ${n.C} ของเรา มันรับได้แค่ <code>Map</code> ที่ key เป็นชื่อคอลัมน์ <code>toMap()</code> จึงแปลงออบเจกต์เป็น Map ก่อนส่งลงฐานข้อมูล</p>
<p><code>if (id != null) 'id': id</code> ใส่ id เฉพาะตอนที่มีค่า ถ้าส่ง <code>'id': null</code> ไปตอน update จะเป็นการสั่งเปลี่ยนคีย์หลักเป็น null แล้วพัง (datatype mismatch)</p>
${F.some(f => f.type === 'bool') ? '<p>SQLite ไม่มีชนิด bool เลยเก็บเป็นเลข 1 กับ 0: <code>x ? 1 : 0</code></p>' : ''}
${F.some(f => f.type === 'DateTime') ? '<p>SQLite ไม่มีชนิดวันที่ เลยเก็บเป็นข้อความด้วย <code>toIso8601String()</code> เช่น "2026-10-15T08:00:00.000"</p>' : ''}`,
        },
        {
          code: `

  // Map → ออบเจกต์ (หลังอ่านจากฐานข้อมูล)
  factory ${E(n.C)}.fromMap(Map<String, dynamic> map) {
    return ${E(n.C)}(
      id: map['id'] as int,
${F.map(f => `      ${E(f.name)}: ${E(f.T.from(f.name))},`).join('\n')}
    );
  }
}`,
          note: `<p>ขากลับ: <code>query()</code> คืนแต่ละแถวมาเป็น Map เราแปลงกลับเป็นออบเจกต์ด้วย <code>fromMap</code> หน้าจอจะได้เขียน <code>${n.c}.${F[0].name}</code> ได้ ไม่ต้องพิมพ์ <code>map['${F[0].name}']</code> เอง ซึ่งพิมพ์ผิดแล้วไม่มีใครเตือน</p>
<p><code>factory</code> คือ constructor ที่สร้างออบเจกต์จากข้อมูลอื่น ส่วน <code>as int</code> คือบอก Dart ว่าค่านี้เป็นชนิดอะไร</p>
${F.some(f => f.type === 'double') ? '<p>ทศนิยมใช้ <code>(map[...] as num).toDouble()</code> เพราะถ้าเคยบันทึกค่า 120 (ไม่มีจุด) SQLite จะคืนมาเป็น int ถ้าเขียน <code>as double</code> ตรงๆ จะพัง</p>' : ''}
${F.some(f => f.type === 'bool') ? '<p>bool อ่านกลับด้วย <code>map[...] == 1</code> ได้ true หรือ false</p>' : ''}
${F.some(f => f.type === 'DateTime') ? '<p>วันที่อ่านกลับด้วย <code>DateTime.parse(...)</code></p>' : ''}`,
        },
      ],
    };
  }

  const createSql = (n, pad) => `CREATE TABLE ${E(n.table)} (
${pad}  id INTEGER PRIMARY KEY AUTOINCREMENT,
${n.fields.map((f, i) => `${pad}  ${E(f.name)} ${E(f.T.sql)} NOT NULL${i < n.fields.length - 1 ? ',' : ''}`).join('\n')}
${pad})`;

  const sqlNote = n => `<p><code>CREATE TABLE</code> สร้างตาราง ${n.table} แต่ละบรรทัดคือ 1 คอลัมน์: ชื่อ ตามด้วยชนิด ตามด้วยข้อบังคับ</p>
<p>ชนิดของ SQLite มีไม่กี่ตัว: String → <code>TEXT</code>, int → <code>INTEGER</code>, double → <code>REAL</code>, bool → <code>INTEGER</code> (0/1), DateTime → <code>TEXT</code></p>
<p><code>INTEGER PRIMARY KEY AUTOINCREMENT</code> ทำให้ id เป็นเลขไม่ซ้ำที่เพิ่มเองทุกครั้งที่ insert ส่วน <code>NOT NULL</code> ห้ามว่าง</p>`;

  // ---------- provider (lab style: provider owns the database) ----------
  function providerLab(n) {
    return {
      path: `lib/providers/${n.provFile}.dart`, key: 'provider', title: 'Provider',
      parts: [
        {
          code: `// lib/providers/${E(n.provFile)}.dart
import 'package:flutter/foundation.dart';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import '../models/${E(n.file)}.dart';

class ${E(n.Prov)} with ChangeNotifier {
  static const String _dbName = '${E(n.db)}';
  static const String _tableName = '${E(n.table)}';
  Database? _database;
  List<${E(n.C)}> _${E(n.p)} = [];

  List<${E(n.C)}> get ${E(n.p)} => [..._${E(n.p)}];

  ${E(n.Prov)}() {
    ${E(n.fetch)}(); // โหลดข้อมูลทันทีที่ provider ถูกสร้าง
  }`,
          note: `<p>Provider คือ "ผู้จัดการ" ที่ถือรายการ ${n.th} ทั้งหมดไว้ หน้าจอไม่คุยกับฐานข้อมูลเอง ต้องสั่งผ่านคลาสนี้</p>
<p><code>with ChangeNotifier</code> ทำให้คลาสนี้เรียก <code>notifyListeners()</code> ได้ คือตะโกนบอกทุกหน้าจอที่ฟังอยู่ว่า "ข้อมูลเปลี่ยนแล้ว วาดใหม่ได้"</p>
<p><code>_${n.p}</code> มีขีดล่างนำหน้า แปลว่าเป็น private ใช้ได้แค่ในไฟล์นี้ ข้างนอกอ่านผ่าน getter <code>${n.p}</code> ซึ่งคืนสำเนา <code>[..._${n.p}]</code> กันไม่ให้หน้าจอแอบแก้ลิสต์ตรงๆ</p>
<p>Constructor เรียก <code>${n.fetch}()</code> เลย เปิดแอปมาก็เห็นข้อมูลเดิมทันที</p>`,
        },
        {
          code: `

  Future<void> _initDatabase() async {
    if (_database != null) return; // เปิดไว้แล้ว ไม่ต้องเปิดซ้ำ
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, _dbName);
    _database = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) {
        return db.execute('''
          ${createSql(n, '          ')}
        ''');
      },
    );
  }`,
          note: `<p>เปิดไฟล์ฐานข้อมูล ถ้ายังไม่มีไฟล์ <code>openDatabase</code> จะสร้างให้แล้วเรียก <code>onCreate</code> <b>ครั้งเดียว</b> ตอนสร้างไฟล์ครั้งแรกเท่านั้น</p>
<p><code>getDatabasesPath()</code> ถามระบบว่าโฟลเดอร์เก็บฐานข้อมูลของแอปอยู่ไหน แล้ว <code>join</code> (จากแพ็กเกจ path) ต่อชื่อไฟล์เข้าไป</p>
${sqlNote(n)}
<p><code>'''...'''</code> คือสตริงหลายบรรทัด และ <code>$_tableName</code> แทนชื่อตารางลงไปในข้อความ</p>`,
        },
        {
          code: `

  // R: อ่านทั้งหมด
  Future<void> ${E(n.fetch)}() async {
    await _initDatabase();
    final rows = await _database!.query(_tableName, orderBy: 'id DESC');
    _${E(n.p)} = rows.map((row) => ${E(n.C)}.fromMap(row)).toList();
    notifyListeners();
  }`,
          note: `<p><b>Read</b>: <code>query(ตาราง)</code> ได้ <code>List&lt;Map&gt;</code> กลับมา แต่ละ Map คือ 1 แถว แล้ว <code>.map(fromMap).toList()</code> แปลงทุกแถวเป็นออบเจกต์ ${n.C}</p>
<p><code>orderBy: 'id DESC'</code> เรียงจากใหม่ไปเก่า</p>
<p><code>_database!</code> เครื่องหมาย <code>!</code> คือยืนยันกับ Dart ว่า "ไม่ null แน่นอน" (เพราะเพิ่ง init ไปบรรทัดก่อน)</p>
<p>บรรทัดสุดท้าย <code>notifyListeners()</code> สำคัญที่สุด ถ้าลืม ข้อมูลเปลี่ยนแต่หน้าจอไม่วาดใหม่</p>`,
        },
        {
          code: `

  // C: เพิ่ม
  Future<void> ${E(n.add)}(${E(n.C)} ${E(n.c)}) async {
    await _initDatabase();
    await _database!.insert(_tableName, ${E(n.c)}.toMap());
    await ${E(n.fetch)}();
  }`,
          note: `<p><b>Create</b>: <code>insert(ตาราง, map)</code> เพิ่ม 1 แถว (และคืน id ใหม่กลับมา) จากนั้นเรียก <code>${n.fetch}()</code> เพื่อโหลดรายการใหม่ ซึ่งในนั้นมี notifyListeners อยู่แล้ว</p>`,
        },
        {
          code: `

  // U: แก้ไข
  Future<void> ${E(n.update)}(${E(n.C)} ${E(n.c)}) async {
    await _initDatabase();
    await _database!.update(
      _tableName,
      ${E(n.c)}.toMap(),
      where: 'id = ?',
      whereArgs: [${E(n.c)}.id],
    );
    await ${E(n.fetch)}();
  }`,
          note: `<p><b>Update</b>: <code>update(ตาราง, map, where:, whereArgs:)</code> แก้แถวที่ตรงเงื่อนไข</p>
<p><code>where: 'id = ?'</code> คือเงื่อนไข เครื่องหมาย <code>?</code> เป็นช่องว่าง แล้ว <code>whereArgs: [${n.c}.id]</code> คือค่าที่เอาไปใส่ช่องนั้นตามลำดับ วิธีนี้กัน SQL Injection เพราะค่าถูกใส่เป็นข้อมูลเสมอ ไม่ถูกอ่านเป็นคำสั่ง</p>
<p>ถ้าลืม <code>where</code> จะแก้<b>ทุกแถว</b>ในตาราง</p>`,
        },
        {
          code: `

  // D: ลบ
  Future<void> ${E(n.del)}(int id) async {
    await _initDatabase();
    await _database!.delete(
      _tableName,
      where: 'id = ?',
      whereArgs: [id],
    );
    await ${E(n.fetch)}();
  }
}`,
          note: `<p><b>Delete</b>: รูปแบบเดียวกับ update แต่ไม่ต้องส่ง Map เพราะแค่บอกว่าลบแถวไหน ถ้าลืม <code>where</code> จะลบ<b>ทุกแถว</b></p>
<p>ทั้ง 4 เมธอดมีจังหวะเดียวกัน: เปิด db → สั่ง SQL → โหลดใหม่ → แจ้งหน้าจอ</p>`,
        },
      ],
    };
  }

  // ---------- helper style: DatabaseHelper singleton + thin provider ----------
  function helper(n) {
    return {
      path: 'lib/helpers/database_helper.dart', key: 'helper', title: 'DatabaseHelper',
      parts: [
        {
          code: `// lib/helpers/database_helper.dart
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import '../models/${E(n.file)}.dart';

class DatabaseHelper {
  static const _databaseName = '${E(n.db)}';
  static const _databaseVersion = 1;
  static const table = '${E(n.table)}';

  // Singleton: ทั้งแอปมี DatabaseHelper ตัวเดียว
  DatabaseHelper._privateConstructor();
  static final DatabaseHelper instance = DatabaseHelper._privateConstructor();

  static Database? _database;
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }`,
          note: `<p>แบบนี้แยกงานฐานข้อมูลไว้ในคลาสของมันเอง (เนื้อหาหลักบท 13) ส่วน provider แค่เรียกใช้</p>
<p><b>Singleton</b> คือคลาสที่มีออบเจกต์ได้ตัวเดียว: constructor เป็น private (<code>._privateConstructor</code>) คนนอกสร้างใหม่ไม่ได้ ต้องใช้ <code>DatabaseHelper.instance</code> ตัวเดียวที่เตรียมไว้</p>
<p>getter <code>database</code> เปิดฐานข้อมูลครั้งแรกที่มีคนขอ แล้วเก็บไว้ใน <code>_database</code> ครั้งต่อไปคืนตัวเดิม ไม่เปิดซ้ำ</p>`,
        },
        {
          code: `

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, _databaseName);
    return await openDatabase(
      path,
      version: _databaseVersion,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      ${createSql(n, '      ')}
    ''');
  }`,
          note: `<p><code>_onCreate</code> ถูกเรียก<b>ครั้งเดียว</b>ตอนไฟล์ .db ถูกสร้างครั้งแรก ถ้าไฟล์มีอยู่แล้ว (เช่นเคยรันแอปมาก่อน) จะไม่ถูกเรียกอีก</p>
${sqlNote(n)}`,
        },
        {
          code: `

  Future<int> insert${E(n.C)}(${E(n.C)} ${E(n.c)}) async {
    final db = await database;
    return await db.insert(table, ${E(n.c)}.toMap());
  }

  Future<List<${E(n.C)}>> queryAll${E(n.P)}() async {
    final db = await database;
    final rows = await db.query(table, orderBy: 'id DESC');
    return rows.map((row) => ${E(n.C)}.fromMap(row)).toList();
  }

  Future<int> update${E(n.C)}(${E(n.C)} ${E(n.c)}) async {
    final db = await database;
    return await db.update(table, ${E(n.c)}.toMap(), where: 'id = ?', whereArgs: [${E(n.c)}.id]);
  }

  Future<int> delete${E(n.C)}(int id) async {
    final db = await database;
    return await db.delete(table, where: 'id = ?', whereArgs: [id]);
  }
}`,
          note: `<p>CRUD ครบ 4 ตัว ทุกเมธอดเริ่มด้วย <code>final db = await database;</code></p>
<p>ค่าที่คืน: <code>insert</code> คืน id ของแถวใหม่, <code>query</code> คืน <code>List&lt;Map&gt;</code> (เราแปลงเป็น List&lt;${n.C}&gt; ให้เลย), <code>update</code> กับ <code>delete</code> คืนจำนวนแถวที่โดนแก้หรือลบ</p>
<p><code>where: 'id = ?'</code> + <code>whereArgs: [...]</code> ระบุแถว ถ้าลืม where จะโดนทุกแถว</p>`,
        },
      ],
    };
  }

  function providerHelper(n) {
    return {
      path: `lib/providers/${n.provFile}.dart`, key: 'provider', title: 'Provider',
      parts: [
        {
          code: `// lib/providers/${E(n.provFile)}.dart
import 'package:flutter/foundation.dart';
import '../helpers/database_helper.dart';
import '../models/${E(n.file)}.dart';

class ${E(n.Prov)} with ChangeNotifier {
  final DatabaseHelper _db = DatabaseHelper.instance;
  List<${E(n.C)}> _${E(n.p)} = [];

  List<${E(n.C)}> get ${E(n.p)} => [..._${E(n.p)}];

  ${E(n.Prov)}() {
    ${E(n.fetch)}();
  }`,
          note: `<p>Provider ถือรายการ ${n.th} ไว้ในหน่วยความจำ และใช้ <code>DatabaseHelper.instance</code> ทำงานกับฐานข้อมูล</p>
<p><code>with ChangeNotifier</code> ทำให้เรียก <code>notifyListeners()</code> ได้ ส่วน getter <code>${n.p}</code> คืนสำเนาของลิสต์ หน้าจอแก้ลิสต์ตัวจริงไม่ได้</p>`,
        },
        {
          code: `

  Future<void> ${E(n.fetch)}() async {
    _${E(n.p)} = await _db.queryAll${E(n.P)}();
    notifyListeners();
  }

  Future<void> ${E(n.add)}(${E(n.C)} ${E(n.c)}) async {
    await _db.insert${E(n.C)}(${E(n.c)});
    await ${E(n.fetch)}();
  }

  Future<void> ${E(n.update)}(${E(n.C)} ${E(n.c)}) async {
    await _db.update${E(n.C)}(${E(n.c)});
    await ${E(n.fetch)}();
  }

  Future<void> ${E(n.del)}(int id) async {
    await _db.delete${E(n.C)}(id);
    await ${E(n.fetch)}();
  }
}`,
          note: `<p>ทุกเมธอดทำ 2 จังหวะ: สั่ง helper เขียนลงฐานข้อมูล แล้วโหลดรายการใหม่ ซึ่งจบด้วย <code>notifyListeners()</code> หน้าจอที่ฟังอยู่จึงวาดใหม่เอง</p>`,
        },
      ],
    };
  }

  // ---------- main.dart ----------
  function main(n) {
    return {
      path: 'lib/main.dart', key: 'main', title: 'main.dart',
      parts: [
        {
          code: `// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/${E(n.provFile)}.dart';
import 'screens/${E(n.listFile)}.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (context) => ${E(n.Prov)}(),
      child: const MyApp(),
    ),
  );
}`,
          note: `<p><code>ChangeNotifierProvider</code> ห่อแอปทั้งแอปไว้ ทำให้ทุกหน้าจอที่อยู่ข้างใต้หยิบ <code>${n.Prov}</code> ตัวเดียวกันไปใช้ได้</p>
<p><code>create</code> สร้าง provider ครั้งเดียวตอนเปิดแอป ถ้าลืมห่อตรงนี้ หน้าจอจะเจอ error <code>ProviderNotFoundException</code></p>
<p>ถ้าโปรเจกต์เดิมมี provider อยู่แล้ว ให้ใช้ <code>MultiProvider</code> ใส่หลายตัว (ดูหัวข้อถัดไป)</p>`,
        },
        {
          code: `

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: '${E(n.C)} App',
      home: ${E(n.List)}(),
    );
  }
}`,
          note: `<p><code>MaterialApp</code> คือตัวแอป <code>home</code> คือหน้าจอแรกที่เห็น เราให้เป็นหน้ารายการ ${n.th}</p>`,
        },
      ],
    };
  }

  const fmtDate = v => `\${${v}.day}/\${${v}.month}/\${${v}.year}`;
  function showField(f, v) {
    const x = `${v}.${f.name}`;
    if (f.type === 'bool') return `\${${x} ? 'ใช่' : 'ไม่'}`;
    if (f.type === 'DateTime') return fmtDate(x);
    return `\${${x}}`;
  }

  // ---------- list screen ----------
  function listScreen(n) {
    const F = n.fields;
    const t = F.find(f => f.type === 'String') || F[0];
    const rest = F.filter(f => f !== t);
    const title = t.type === 'String' ? `Text(${E(n.c)}.${E(t.name)})` : `Text('${E(showField(t, n.c))}')`;
    const sub = rest.length ? `\n                subtitle: Text('${rest.map(f => E(`${f.label}: ${showField(f, n.c)}`)).join('  ')}'),` : '';
    return {
      path: `lib/screens/${n.listFile}.dart`, key: 'list', title: 'หน้ารายการ',
      parts: [
        {
          code: `// lib/screens/${E(n.listFile)}.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/${E(n.provFile)}.dart';
import '${E(n.formFile)}.dart';

class ${E(n.List)} extends StatelessWidget {
  const ${E(n.List)}({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('${E('รายการ' + n.th)}')),`,
          note: `<p>หน้ารายการเป็น <code>StatelessWidget</code> เพราะตัวหน้าจอไม่ได้เก็บข้อมูลเอง ข้อมูลอยู่ใน provider</p>
<p><code>Scaffold</code> คือโครงหน้าจอสำเร็จรูป มีช่องให้ใส่ <code>appBar</code> (แถบบน) <code>body</code> (เนื้อหา) และ <code>floatingActionButton</code> (ปุ่มกลมมุมขวาล่าง)</p>`,
        },
        {
          code: `
      body: Consumer<${E(n.Prov)}>(
        builder: (context, provider, child) {
          final ${E(n.p)} = provider.${E(n.p)};
          if (${E(n.p)}.isEmpty) {
            return const Center(child: Text('${E('ยังไม่มี' + n.th)}'));
          }`,
          note: `<p><code>Consumer&lt;${n.Prov}&gt;</code> คือส่วนที่ "ฟัง" provider ทุกครั้งที่ provider เรียก <code>notifyListeners()</code> ฟังก์ชัน <code>builder</code> จะถูกเรียกใหม่และวาดเฉพาะส่วนนี้ใหม่</p>
<p><code>builder</code> ได้ 3 ค่า: <code>context</code>, ตัว provider เอง และ <code>child</code> (ส่วนที่ไม่ต้องวาดใหม่ ไม่ได้ใช้ในที่นี้)</p>
<p>ถ้ายังไม่มีข้อมูลให้แสดงข้อความกลางจอแทนลิสต์ว่างๆ</p>`,
        },
        {
          code: `
          return ListView.builder(
            itemCount: ${E(n.p)}.length,
            itemBuilder: (context, index) {
              final ${E(n.c)} = ${E(n.p)}[index];
              return ListTile(
                title: ${title},${sub}
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ${E(n.Form)}(${E(n.c)}: ${E(n.c)}),
                  ),
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.delete),
                  onPressed: () => provider.${E(n.del)}(${E(n.c)}.id!),
                ),
              );
            },
          );
        },
      ),`,
          note: `<p><code>ListView.builder</code> สร้างแถวทีละแถวตามจำนวน <code>itemCount</code> และเรียก <code>itemBuilder</code> กับ index 0, 1, 2, ...</p>
<p><code>ListTile</code> คือแถวสำเร็จรูป มี title (บรรทัดหลัก) subtitle (บรรทัดรอง) และ trailing (ด้านขวา)</p>
<p><b>แตะแถว = แก้ไข</b>: <code>Navigator.push</code> เปิดหน้าฟอร์มทับขึ้นไป และส่งออบเจกต์ที่แตะผ่าน constructor <code>${n.Form}(${n.c}: ${n.c})</code></p>
<p><b>กดถังขยะ = ลบ</b>: เรียก <code>provider.${n.del}(id)</code> ตรงๆ <code>id!</code> ใช้ ! เพราะของที่อ่านจากฐานข้อมูลมี id แน่นอน</p>`,
        },
        {
          code: `
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const ${E(n.Form)}()),
        ),
        child: const Icon(Icons.add),
      ),
    );
  }
}`,
          note: `<p><b>กด + = เพิ่ม</b>: เปิดหน้าฟอร์มเดียวกันแต่ไม่ส่งอะไรไป ฟอร์มจะรู้เองว่าเป็นโหมดเพิ่มใหม่ (เพราะ ${n.c} เป็น null)</p>
<p>ไม่ต้องสั่งรีเฟรชตอนกลับมา เพราะฟอร์มบันทึกผ่าน provider แล้ว provider แจ้ง Consumer ให้วาดใหม่เอง</p>`,
        },
      ],
    };
  }

  // ---------- form screen ----------
  function formScreen(n) {
    const F = n.fields;
    const texts = F.filter(f => ['text', 'int', 'double'].includes(f.T.input));
    const sw = F.filter(f => f.T.input === 'switch');
    const dates = F.filter(f => f.T.input === 'date');
    const ctl = f => `_${f.name}Controller`;
    const stateVar = f => `_${f.name}`;

    const decl = [
      ...texts.map(f => `  final ${E(ctl(f))} = TextEditingController();`),
      ...sw.map(f => `  bool ${E(stateVar(f))} = false;`),
      ...dates.map(f => `  DateTime ${E(stateVar(f))} = DateTime.now();`),
    ].join('\n');

    const fill = [
      ...texts.map(f => `      ${E(ctl(f))}.text = ${E(n.c)}.${E(f.name)}${f.type === 'String' ? '' : '.toString()'};`),
      ...sw.map(f => `      ${E(stateVar(f))} = ${E(n.c)}.${E(f.name)};`),
      ...dates.map(f => `      ${E(stateVar(f))} = ${E(n.c)}.${E(f.name)};`),
    ].join('\n');

    const disp = texts.map(f => `    ${E(ctl(f))}.dispose();`).join('\n');

    const pickers = dates.map(f => `

  Future<void> _pick${E(cap(f.name))}() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: ${E(stateVar(f))},
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() => ${E(stateVar(f))} = picked);
    }
  }`).join('');

    const val = f => {
      if (f.type === 'String') return `${ctl(f)}.text`;
      if (f.type === 'int') return `int.parse(${ctl(f)}.text)`;
      if (f.type === 'double') return `double.parse(${ctl(f)}.text)`;
      return stateVar(f);
    };

    const widgets = F.map(f => {
      if (f.T.input === 'switch') return `            SwitchListTile(
              title: const Text('${E(f.label)}'),
              value: ${E(stateVar(f))},
              onChanged: (value) => setState(() => ${E(stateVar(f))} = value),
            ),`;
      if (f.T.input === 'date') return `            ListTile(
              title: const Text('${E(f.label)}'),
              subtitle: Text('${E(fmtDate(stateVar(f)))}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: _pick${E(cap(f.name))},
            ),`;
      const num = f.type !== 'String';
      const check = f.type === 'String'
        ? `if (value == null || value.trim().isEmpty) return 'กรุณากรอก${E(f.label)}';`
        : `if (value == null || ${f.type}.tryParse(value) == null) return 'กรุณากรอก${E(f.label)}เป็นตัวเลข';`;
      return `            TextFormField(
              controller: ${E(ctl(f))},
              decoration: const InputDecoration(labelText: '${E(f.label)}'),${num ? `\n              keyboardType: TextInputType.number,` : ''}
              validator: (value) {
                ${check}
                return null;
              },
            ),`;
    }).join('\n');

    return {
      path: `lib/screens/${n.formFile}.dart`, key: 'form', title: 'หน้าฟอร์ม',
      parts: [
        {
          code: `// lib/screens/${E(n.formFile)}.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/${E(n.file)}.dart';
import '../providers/${E(n.provFile)}.dart';

class ${E(n.Form)} extends StatefulWidget {
  final ${E(n.C)}? ${E(n.c)}; // null = เพิ่มใหม่, มีค่า = แก้ไข
  const ${E(n.Form)}({super.key, this.${E(n.c)}});

  @override
  State<${E(n.Form)}> createState() => _${E(n.Form)}State();
}`,
          note: `<p>ใช้หน้าจอเดียวทั้ง <b>เพิ่ม</b> และ <b>แก้ไข</b> ตัวแปร <code>${n.c}</code> เป็นตัวบอกโหมด: ถ้า null คือเพิ่มใหม่ ถ้ามีค่าคือกำลังแก้รายการนั้น</p>
<p>เป็น <code>StatefulWidget</code> เพราะหน้าฟอร์มต้องจำค่าที่ผู้ใช้กำลังพิมพ์/เลือก StatefulWidget มาเป็นคู่เสมอ: คลาสวิดเจ็ต (ค่าที่รับมาจากข้างนอก) กับคลาส <code>State</code> (ค่าที่เปลี่ยนได้)</p>
<p>ใน State เข้าถึงค่าที่ส่งมาผ่าน <code>widget.${n.c}</code></p>`,
        },
        {
          code: `

class _${E(n.Form)}State extends State<${E(n.Form)}> {
  final _formKey = GlobalKey<FormState>();
${decl}

  @override
  void initState() {
    super.initState();
    final ${E(n.c)} = widget.${E(n.c)};
    if (${E(n.c)} != null) {
${fill}
    }
  }

  @override
  void dispose() {
${disp || '    // ไม่มี controller ให้คืน'}
    super.dispose();
  }`,
          note: `<p><code>GlobalKey&lt;FormState&gt;</code> คือ "รีโมต" ของฟอร์ม ใช้สั่ง <code>validate()</code> ตรวจทุกช่องพร้อมกัน</p>
${texts.length ? `<p><code>TextEditingController</code> 1 ตัวต่อ 1 ช่องพิมพ์ ใช้อ่านค่า (<code>.text</code>) และใส่ค่าเริ่มต้น</p>` : ''}
${sw.length || dates.length ? `<p>ค่าที่ไม่ได้พิมพ์ (${[...sw, ...dates].map(f => f.label).join(', ')}) เก็บเป็นตัวแปรธรรมดาใน State และเปลี่ยนด้วย <code>setState</code></p>` : ''}
<p><code>initState</code> ทำงานครั้งเดียวตอนเปิดหน้า: ถ้าเป็นโหมดแก้ไข ก็เติมค่าเดิมลงช่องต่างๆ (ตัวเลขต้อง <code>.toString()</code> เพราะช่องพิมพ์รับแต่ข้อความ)</p>
<p><code>dispose</code> ทำงานตอนปิดหน้า ต้องคืนหน่วยความจำของ controller ทุกตัว</p>`,
        },
        ...(pickers ? [{
          code: pickers,
          note: `<p><code>showDatePicker</code> เปิดปฏิทินให้เลือก และต้อง <code>await</code> เพราะต้องรอผู้ใช้เลือก ถ้ากดยกเลิกจะได้ null</p>
<p>เลือกแล้วต้องเปลี่ยนค่าใน <code>setState</code> หน้าจอถึงจะวาดวันที่ใหม่</p>`,
        }] : []),
        {
          code: `

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final ${E(n.c)} = ${E(n.C)}(
      id: widget.${E(n.c)}?.id,
${F.map(f => `      ${E(f.name)}: ${E(val(f))},`).join('\n')}
    );
    final provider = context.read<${E(n.Prov)}>();
    if (widget.${E(n.c)} == null) {
      await provider.${E(n.add)}(${E(n.c)});
    } else {
      await provider.${E(n.update)}(${E(n.c)});
    }
    if (!mounted) return;
    Navigator.pop(context);
  }`,
          note: `<p>หัวใจของฟอร์ม ทำตามลำดับ:</p>
<p>1. <code>validate()</code> เรียก validator ทุกช่อง ถ้ามีช่องไหนคืนข้อความ error ก็ได้ false แล้ว <code>return</code> ออกเลย</p>
<p>2. สร้างออบเจกต์ ${n.C} จากค่าในฟอร์ม <code>id: widget.${n.c}?.id</code> ได้ null ตอนเพิ่ม และได้ id เดิมตอนแก้ (<code>?.</code> คือถ้าซ้ายเป็น null ก็ให้ผลเป็น null ไม่พัง)${texts.some(f => f.type !== 'String') ? ' ตัวเลขต้องแปลงจากข้อความด้วย <code>int.parse</code> / <code>double.parse</code>' : ''}</p>
<p>3. <code>context.read&lt;${n.Prov}&gt;()</code> หยิบ provider มาสั่งงาน ใช้ <b>read</b> (ไม่ใช่ watch) เพราะแค่สั่ง ไม่ได้ต้องการฟังการเปลี่ยนแปลง</p>
<p>4. ไม่มี id เดิม = add, มี = update</p>
<p>5. <code>if (!mounted) return;</code> หลัง await หน้าจออาจถูกปิดไปแล้ว ตรวจก่อนใช้ context แล้ว <code>Navigator.pop</code> ปิดฟอร์มกลับไปหน้ารายการ</p>`,
        },
        {
          code: `

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.${E(n.c)} != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? '${E('แก้ไข' + n.th)}' : '${E('เพิ่ม' + n.th)}')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
${widgets}
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _save,
              child: const Text('บันทึก'),
            ),
          ],
        ),
      ),
    );
  }
}`,
          note: `<p><code>Form(key: _formKey)</code> ครอบทุกช่อง ทำให้ <code>_formKey.currentState!.validate()</code> ตรวจได้ทุกช่องในครั้งเดียว ใช้ <code>ListView</code> แทน Column เพื่อให้เลื่อนได้ตอนคีย์บอร์ดเด้งขึ้นมาบัง</p>
<p><code>TextFormField</code> คือช่องพิมพ์ที่ทำงานกับ Form ได้ (TextField ธรรมดาไม่มี validator) <code>validator</code> คืน <code>null</code> = ผ่าน, คืนข้อความ = ไม่ผ่านและข้อความนั้นจะโชว์ใต้ช่องเป็นสีแดง</p>
${sw.length ? '<p><code>SwitchListTile</code> คือสวิตช์เปิดปิดพร้อมชื่อ ใช้กับ bool</p>' : ''}
${dates.length ? '<p>วันที่ใช้ <code>ListTile</code> ที่แตะแล้วเปิดปฏิทิน</p>' : ''}
<p><code>InputDecoration(labelText: ...)</code> คือป้ายชื่อในช่อง <code>keyboardType: TextInputType.number</code> เปิดแป้นตัวเลข</p>`,
        },
      ],
    };
  }

  function build(ent, mode) {
    const n = names(ent);
    const files = mode === 'helper'
      ? [model(n), helper(n), providerHelper(n), main(n), listScreen(n), formScreen(n)]
      : [model(n), providerLab(n), main(n), listScreen(n), formScreen(n)];
    files.forEach(f => { f.code = f.parts.map(p => p.code).join(''); });
    return { n, files };
  }

  const api = { ENTITIES, TYPES, build, check, names, strip, plural, snake, lower };
  if (typeof module !== 'undefined') module.exports = api; else root.Gen = api;
})(this);
