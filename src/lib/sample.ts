/* Sample bookings for trying the app. Loaded from Settings or the empty Today screen, never on its own.
   Dates are relative to today. */
import { makeBooking, type BookingSeed } from './model';
import { offsetIso as off } from './util';
import type { Booking } from './types';

export function sampleBookings(groupPct: number): Booking[] {
  const P = (label: string, h: number) => ({ label, h });
  const list=[
 {name:'มิกะ',series:'ตัวละคร OC',price:2800,paid:2800,slots:[
   {date:off(0),time:'09:30',dur:60,place:'สวนเบญจกิติ',char:'เจ้าหญิงพายุ',done:1,refs:[P('ยืนหันข้าง มองกล้อง',330),P('ผ้าคลุมปลิว',280),P('นั่งบนบันได',210),P('โคลสอัปมือ',20)]},
   {date:off(0),time:'11:30',dur:60,place:'คาเฟ่ Mellow · อารีย์',char:'สาวคาเฟ่เมด',refs:[P('ยกถาดขนมหวาน',20),P('นั่งริมหน้าต่าง',190)]}]},
 {name:'ต้นข้าว',char:'นักดาบจันทรา',series:'Lunar Blade',date:off(0),time:'13:00',dur:90,place:'งาน Cos Fest · สามย่านมิตรทาวน์',price:2500,paid:1000,refs:[P('ชักดาบ มุมต่ำ',250),P('หลังพิงเสา',200),P('แอ็กชันกระโดด',190)]},
 {name:'Nami',char:'นักบินอวกาศ',series:'Orbit 9',date:off(0),time:'14:40',dur:40,place:'งาน Cos Fest · สามย่านมิตรทาวน์',price:1200,paid:1200,refs:[P('ลอยตัว ไร้น้ำหนัก',200),P('ถอดหมวกอวกาศ',215)]},
 {type:'project',name:'Garden of Ash',series:'Garden of Ash',date:off(0),time:'16:30',dur:150,place:'สตูดิโอ Room 9 อารีย์',price:8000,paid:4000,
  people:[{name:'Pim.cos',char:'แม่มดดอกไม้'},{name:'Yuki',char:'อัศวินเถาวัลย์'},{name:'Bam',char:'ภูตเห็ด'},{name:'Toey',char:'ราชินีกุหลาบ'}],
  shots:[{label:'ถ่ายรวม',who:'all',min:40,refs:[P('ยืนเรียงหน้ากำแพงดอกไม้',140),P('นั่งล้อมโต๊ะน้ำชา',100),P('เดินเข้าหากล้อง',60)]},
    {label:'คู่ Pim × Toey',who:[0,3],min:15,refs:[P('หันหลังชนกัน',330)]},
    {label:'เดี่ยว Pim.cos',who:[0],min:25,refs:[P('ถือไม้กายสิทธิ์',140),P('ไฟย้อนแสง',40)]},
    {label:'เดี่ยว Yuki',who:[1],min:20,refs:[P('ชูดาบเถาวัลย์',120)]},
    {label:'เดี่ยว Bam',who:[2],min:20,refs:[]},
    {label:'เดี่ยว Toey',who:[3],min:20,refs:[P('กุหลาบปิดหน้า',350)]}]},
 {name:'ไหม',char:'ผู้พิทักษ์หิมะ',series:'Frostline',date:off(2),time:'10:00',dur:90,place:'สวนลุมพินี',price:2000,paid:1000,refs:[P('เกราะเต็มตัว',200)]},
 {type:'project',name:'Frostline Team',series:'Frostline',date:off(4),time:'10:00',dur:180,place:'สวนลุมพินี',price:12000,paid:6000,
  people:[{name:'Ploy',char:'ราชินีน้ำแข็ง'},{name:'Kao',char:'นักธนูหิมะ'},{name:'Arm',char:'อัศวินหิมะ'}],
  shots:[{label:'ถ่ายรวม',who:'all',min:60},{label:'เดี่ยว Ploy',who:[0],min:40},{label:'เดี่ยว Kao',who:[1],min:40},{label:'เดี่ยว Arm',who:[2],min:40}],
  more:[{date:off(5),time:'15:00',dur:120,place:'สตูดิโอ Room 9 อารีย์'}]},
 {name:'Jun',char:'โจรสลัดฟ้า',series:'Skyrend',date:off(3),time:'15:00',dur:60,place:'ท่าเรือเอเชียทีค',price:1800,paid:0,refs:[]},
 {name:'โบว์',char:'นักเรียนเวทมนตร์',series:'Academy 7',date:off(5),time:'11:00',dur:120,place:'สตูดิโอ Room 9 อารีย์',price:3500,paid:1750,refs:[]},
 {name:'Kei',char:'หุ่นยนต์ R-09',series:'ตัวละคร OC',date:off(6),time:'14:00',dur:90,place:'งาน Cos Fest · ไบเทค',price:2500,paid:0,refs:[]},
 {name:'ฟ้าใส',char:'ราชินีทะเลทราย',series:'Dune Crown',date:off(8),time:'09:00',dur:60,place:'สวนรถไฟ',price:1500,paid:0,refs:[]},
 {name:'มิว',char:'จิ้งจอกเก้าหาง',series:'ตัวละคร OC',date:off(-2),time:'10:00',dur:90,place:'วัดอรุณฯ (ฝั่งท่าเรือ)',price:2500,paid:2500,refs:[]},
 {name:'Nat',char:'อัศวินดำ',series:'Black Oath',date:off(-5),time:'16:00',dur:60,place:'สวนเบญจกิติ',price:1500,paid:1500,refs:[]},
 {type:'project',name:'Starlit',series:'Starlit',date:off(-9),time:'13:00',dur:150,place:'สตูดิโอ Room 9 อารีย์',price:6000,paid:6000,
  people:[{name:'แพร',char:'นางฟ้าดวงดาว'},{name:'มีน',char:'ดาวหาง'},{name:'ขิม',char:'จันทร์เสี้ยว'}],
  shots:[{label:'ถ่ายรวม',who:'all',min:50},{label:'เดี่ยว แพร',who:[0],min:30},{label:'เดี่ยว มีน',who:[1],min:30},{label:'เดี่ยว ขิม',who:[2],min:30}]},
 {name:'ไอซ์',char:'นักสืบหมวกแดง',series:'Case 221',date:off(-12),time:'11:00',dur:60,place:'เยาวราช',price:1500,paid:500,refs:[]},
 {name:'ปุยฝ้าย',char:'แมวเวทมนตร์',series:'ตัวละคร OC',date:off(-14),time:'10:30',dur:90,place:'สวนลุมพินี',price:2000,paid:2000,refs:[]},
];
  const stage={'Jun':'cancelled','มิกะ':'shooting','มิว':'editing','ไอซ์':'editing','Starlit':'editing','Nat':'delivered','ปุยฝ้าย':'delivered'};
  return (list as any[]).map(o => {
    const slots = o.slots || [{ date: o.date, time: o.time, dur: o.dur, place: o.place, char: o.char, refs: o.refs, shots: o.shots }, ...(o.more || [])];
    const seed: BookingSeed = { type: o.type, name: o.name, series: o.series, price: o.price, paid: o.paid, people: o.people, slots, stage: (stage as any)[o.name] || 'wait' };
    return makeBooking(seed, groupPct);
  });
}
