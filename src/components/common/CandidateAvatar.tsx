import React, { useId, useMemo } from 'react';

export type Gender = 'male' | 'female';

// Common Persian female first names
const FEMALE_NAMES = new Set([
  'زهرا', 'فاطمه', 'مریم', 'سارا', 'نیلوفر', 'نازنین', 'پریسا', 'الهام', 'عاطفه', 'مهسا',
  'شیما', 'بهاره', 'سپیده', 'نگار', 'ندا', 'پگاه', 'هانیه', 'شقایق', 'سحر', 'رویا',
  'فرشته', 'رعنا', 'یلدا', 'کیمیا', 'صبا', 'مونا', 'لیدا', 'مهناز', 'آناهیتا', 'بیتا',
  'پروانه', 'ترانه', 'تینا', 'درسا', 'دنیا', 'رها', 'ژاله', 'ستاره', 'سوگند', 'شبنم',
  'شیدا', 'طلا', 'عسل', 'غزال', 'فرنوش', 'گلنار', 'لاله', 'مرجان', 'مژده', 'مهشید',
  'مینا', 'نسترن', 'نسرین', 'نغمه', 'نوشین', 'هدیه', 'یاسمن', 'یکتا', 'آیسان', 'افسانه',
  'انسیه', 'بهنوش', 'پرنیان', 'تارا', 'ثمین', 'حنانه', 'خاطره', 'درنا', 'راحله', 'ریحانه',
  'زکیه', 'سمیرا', 'سودابه', 'شکوفه', 'صدف', 'طاهره', 'فائزه', 'فرزانه', 'فریبا', 'ماندانا',
  'محبوبه', 'مرضیه', 'معصومه', 'ملیحه', 'مهتا', 'میترا', 'نرجس', 'نیره', 'ویدا', 'هلیا',
  'هما', 'پریناز', 'شایسته', 'دلارام', 'بهار', 'باران', 'پریا', 'روناک', 'سوگل', 'رومینا',
  'ملیکا', 'هلن', 'النا', 'الینا', 'دیانا', 'هانا', 'هستی', 'هلنا', 'ملینا', 'رونیکا',
  'مهرسا', 'مانلی', 'جانان', 'تمنا', 'حورا', 'محیا', 'حلما', 'اسما', 'حسنا', 'رضوانه',
  'سمانه', 'سمیه', 'سکینه', 'بتول', 'هاجر', 'خدیجه', 'زینب', 'کلثوم', 'رقیه', 'آسیه',
  'شهرزاد', 'فرانک', 'کتایون', 'منیژه', 'پروین', 'نیکی', 'گلاره', 'چکامه', 'تهمینه', 'سیمین',
  'گلی', 'روژین', 'مهدیه', 'عطیه', 'راضیه', 'ستایش', 'ژینا', 'آرمیتا', 'بنیتا', 'آنیتا',
  'سلین', 'پانته‌آ', 'پانته آ', 'کیانا', 'غزاله', 'افسون', 'شادی', 'دل‌آرام', 'آیدا'
]);

// Common Persian male first names
const MALE_NAMES = new Set([
  'علی', 'محمد', 'رضا', 'حسین', 'مهدی', 'امیر', 'احمد', 'امید', 'حمید', 'سعید',
  'نوید', 'وحید', 'فرهاد', 'بهزاد', 'میلاد', 'احسان', 'پویا', 'پوریا', 'سینا', 'سهیل',
  'نیما', 'آرش', 'آرمین', 'سامان', 'ساسان', 'پیمان', 'کامران', 'کیان', 'کوروش', 'داریوش',
  'بابک', 'بردیا', 'پارسا', 'آرتین', 'آراد', 'شایان', 'رادین', 'ایلیا', 'دانیال', 'متین',
  'سپهر', 'شاهین', 'رامین', 'کامبیز', 'مسعود', 'مصطفی', 'مرتضی', 'مجتبی', 'هادی', 'مهرداد',
  'فرزاد', 'فرشاد', 'پژمان', 'سروش', 'مازیار', 'مهران', 'شهرام', 'بهنام', 'پیام', 'پدرام',
  'فرزین', 'کاوه', 'خسرو', 'سهراب', 'ارسلان', 'جمشید', 'رستم', 'کیومرث', 'سجاد', 'سلیمان',
  'صادق', 'عادل', 'عرفان', 'قادر', 'قاسم', 'مالک', 'محسن', 'مختار', 'مسلم', 'منصور',
  'مهدیار', 'میثاق', 'میثم', 'نادر', 'ناصر', 'هاشم', 'یاسر', 'یحیی', 'یونس', 'بهمن',
  'بیژن', 'جهانگیر', 'روزبه', 'سیاوش', 'فرید', 'کیوان', 'همایون', 'هوشنگ', 'یزدان', 'اشکان',
  'افشین', 'البرز', 'الوند', 'انوش', 'ایرج', 'باربد', 'بامداد', 'بهرنگ', 'بهروز', 'پرهام',
  'تورج', 'خشایار', 'رامتین', 'رهام', 'زانیار', 'سام', 'سامر', 'سبحان', 'سیروان', 'شروین',
  'شهروز', 'صابر', 'ضیا', 'طاها', 'طاهر', 'عباس', 'عماد', 'عطا', 'غلامرضا', 'فواد',
  'کیا', 'ماکان', 'مانی', 'مهیار', 'نریمان', 'هومن', 'هیراد', 'یاشار', 'ابوالفضل', 'امیرحسین',
  'امیرعلی', 'امیررضا', 'علیرضا', 'محمدرضا', 'احمدرضا', 'حمیدرضا', 'غلامحسین', 'محسن', 'حسن'
]);

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function detectCandidateGender(fullName?: string | null): { gender: Gender; avatarIndex: number } {
  if (!fullName || !fullName.trim()) {
    return { gender: 'male', avatarIndex: 0 };
  }

  const raw = fullName.trim();
  const cleaned = raw
    .replace(/(?:سید|سیده|میر|حاج|حاجی|کربلایی|دکتر|مهندس|آقای|خانم|استاد)\s+/gi, '')
    .trim();
  
  const tokens = cleaned.split(/[\s_-]+/);
  const firstName = tokens[0] || cleaned;
  const hash = Math.abs(hashString(cleaned));

  // Check explicit honorifics
  if (raw.startsWith('خانم') || raw.startsWith('سیده') || raw.includes('بانو')) {
    return { gender: 'female', avatarIndex: hash % 5 };
  }
  if (raw.startsWith('آقای') || raw.startsWith('سید')) {
    return { gender: 'male', avatarIndex: hash % 5 };
  }

  // Check first name dictionary
  if (FEMALE_NAMES.has(firstName)) {
    return { gender: 'female', avatarIndex: hash % 5 };
  }
  if (MALE_NAMES.has(firstName)) {
    return { gender: 'male', avatarIndex: hash % 5 };
  }

  // Check common female suffixes
  if (firstName.endsWith('دخت') || firstName.endsWith('ناز') || firstName.endsWith('بانو') || firstName.endsWith('گل')) {
    return { gender: 'female', avatarIndex: hash % 5 };
  }

  // Fallback: deterministic distribution based on string hash
  const gender: Gender = hash % 2 === 0 ? 'male' : 'female';
  const avatarIndex = (Math.floor(hash / 2)) % 5;
  return { gender, avatarIndex };
}

interface CandidateAvatarProps {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  category?: 'INTERVIEW' | 'REVIEW' | 'REJECT' | 'UNJUDGEABLE' | string;
}

/**
 * 10 Beautiful 3D Character Avatars (5 Boys, 5 Girls)
 * Built with rich radial & linear 3D lighting, smooth specular highlights, depth and soft shadows.
 */
export const CandidateAvatar: React.FC<CandidateAvatarProps> = ({
  name,
  size = 'md',
  className = '',
  category,
}) => {
  const uid = useId().replace(/:/g, '');
  const { gender, avatarIndex } = useMemo(() => detectCandidateGender(name), [name]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-11 h-11 sm:w-12 sm:h-12',
    xl: 'w-16 h-16',
  }[size];

  const ringTone = category === 'INTERVIEW'
    ? 'ring-2 ring-brand/50 shadow-brand/10'
    : category === 'REVIEW'
    ? 'ring-2 ring-warning/50 shadow-warning/10'
    : category === 'REJECT'
    ? 'ring-2 ring-danger/40 shadow-danger/10'
    : 'ring-1 ring-border-default';

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 select-none shadow-xs transition-transform hover:scale-105 ${sizeClasses} ${ringTone} ${className}`}
      title={name || 'کاندید'}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full block"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Shared 3D Lighting Gradients */}
          <radialGradient id={`${uid}-skin-light`} cx="38%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFE0BD" />
            <stop offset="65%" stopColor="#F5C197" />
            <stop offset="100%" stopColor="#DE9E6E" />
          </radialGradient>

          <radialGradient id={`${uid}-skin-warm`} cx="40%" cy="32%" r="60%">
            <stop offset="0%" stopColor="#FFDFC4" />
            <stop offset="70%" stopColor="#F3B98E" />
            <stop offset="100%" stopColor="#D99462" />
          </radialGradient>

          <radialGradient id={`${uid}-skin-tan`} cx="38%" cy="28%" r="62%">
            <stop offset="0%" stopColor="#FAD0AE" />
            <stop offset="75%" stopColor="#E2A677" />
            <stop offset="100%" stopColor="#BF7D4D" />
          </radialGradient>

          <linearGradient id={`${uid}-specular`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Background Studios */}
          <radialGradient id={`${uid}-bg-boy0`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="100%" stopColor="#7DD3FC" />
          </radialGradient>
          <radialGradient id={`${uid}-bg-boy1`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#DCFCE7" />
            <stop offset="100%" stopColor="#86EFAC" />
          </radialGradient>
          <radialGradient id={`${uid}-bg-boy2`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#EDE9FE" />
            <stop offset="100%" stopColor="#C4B5FD" />
          </radialGradient>
          <radialGradient id={`${uid}-bg-boy3`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#FCD34D" />
          </radialGradient>
          <radialGradient id={`${uid}-bg-boy4`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </radialGradient>

          <radialGradient id={`${uid}-bg-girl0`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#D1FAE5" />
            <stop offset="100%" stopColor="#6EE7B7" />
          </radialGradient>
          <radialGradient id={`${uid}-bg-girl1`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#FCE7F3" />
            <stop offset="100%" stopColor="#F472B6" />
          </radialGradient>
          <radialGradient id={`${uid}-bg-girl2`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#E0E7FF" />
            <stop offset="100%" stopColor="#A5B4FC" />
          </radialGradient>
          <radialGradient id={`${uid}-bg-girl3`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#FFE4E6" />
            <stop offset="100%" stopColor="#FDA4AF" />
          </radialGradient>
          <radialGradient id={`${uid}-bg-girl4`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#FDE047" />
          </radialGradient>
        </defs>

        {/* Render Selected 3D Character */}
        {gender === 'male' && avatarIndex === 0 && (
          // ================= MALE 0: Modern Tech with Stylish 3D Glasses =================
          <g>
            <circle cx="50" cy="50" r="50" fill={`url(#${uid}-bg-boy0)`} />
            {/* Clothes: Teal crewneck */}
            <path d="M22 100 C24 76, 38 72, 50 72 C62 72, 76 76, 78 100 Z" fill="#0284C7" />
            <path d="M42 72 C42 77, 58 77, 58 72 Z" fill="#0369A1" />
            {/* Neck */}
            <path d="M43 62 L57 62 L56 74 C50 77, 50 77, 44 74 Z" fill="#E2A677" />
            {/* Head */}
            <ellipse cx="50" cy="46" rx="20" ry="23" fill={`url(#${uid}-skin-light)`} />
            {/* Ears */}
            <circle cx="29" cy="47" r="4.5" fill="#F5C197" />
            <circle cx="71" cy="47" r="4.5" fill="#F5C197" />
            {/* Hair: Textured 3D side crop */}
            <path d="M28 41 C27 27, 36 21, 50 21 C64 21, 73 27, 72 41 C67 36, 61 31, 50 31 C39 31, 33 36, 28 41 Z" fill="#1E293B" />
            <ellipse cx="50" cy="24" rx="14" ry="4" fill="#334155" />
            {/* Glasses (3D dark rim with highlight) */}
            <rect x="33" y="41" width="14" height="10" rx="3" fill="#0F172A" />
            <rect x="53" y="41" width="14" height="10" rx="3" fill="#0F172A" />
            <rect x="47" y="44" width="6" height="2" fill="#0F172A" />
            {/* Lenses reflection */}
            <rect x="35" y="43" width="10" height="6" rx="1.5" fill="#38BDF8" fillOpacity="0.4" />
            <rect x="55" y="43" width="10" height="6" rx="1.5" fill="#38BDF8" fillOpacity="0.4" />
            <path d="M36 44 L40 44" stroke="#FFF" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
            <path d="M56 44 L60 44" stroke="#FFF" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
            {/* Smile */}
            <path d="M44 59 Q50 63 56 59" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {gender === 'male' && avatarIndex === 1 && (
          // ================= MALE 1: Young Creative with Modern Headphones =================
          <g>
            <circle cx="50" cy="50" r="50" fill={`url(#${uid}-bg-boy1)`} />
            {/* Clothes: Emerald Sport Jacket */}
            <path d="M20 100 C24 74, 38 70, 50 70 C62 70, 76 74, 80 100 Z" fill="#059669" />
            <path d="M50 70 L50 100" stroke="#047857" strokeWidth="2" />
            <path d="M42 70 L50 78 L58 70 Z" fill="#FFFFFF" />
            {/* Neck */}
            <path d="M43 60 L57 60 L56 72 C50 75, 50 75, 44 72 Z" fill="#DE9E6E" />
            {/* Head */}
            <ellipse cx="50" cy="45" rx="19.5" ry="22.5" fill={`url(#${uid}-skin-warm)`} />
            {/* 3D Headphones Arch */}
            <path d="M25 45 C25 22, 75 22, 75 45" stroke="#334155" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <path d="M30 30 C30 26, 70 26, 70 30" stroke="#00C87B" strokeWidth="2" fill="none" opacity="0.7" />
            {/* Headphone Cushions */}
            <rect x="23" y="38" width="6.5" height="14" rx="3" fill="#0F172A" />
            <circle cx="26" cy="45" r="2" fill="#00C87B" />
            <rect x="70.5" y="38" width="6.5" height="14" rx="3" fill="#0F172A" />
            <circle cx="74" cy="45" r="2" fill="#00C87B" />
            {/* Hair: Swept volume */}
            <path d="M32 37 C34 23, 44 20, 54 22 C64 24, 68 28, 68 36 C62 31, 52 30, 42 32 C37 33, 34 35, 32 37 Z" fill="#292524" />
            {/* Eyes */}
            <ellipse cx="43" cy="44" rx="2" ry="2.5" fill="#1C1917" />
            <ellipse cx="57" cy="44" rx="2" ry="2.5" fill="#1C1917" />
            <circle cx="43.5" cy="43.5" r="0.7" fill="#FFF" />
            <circle cx="57.5" cy="43.5" r="0.7" fill="#FFF" />
            {/* Brows */}
            <path d="M40 39 Q43 37 46 39" stroke="#292524" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <path d="M54 39 Q57 37 60 39" stroke="#292524" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            {/* Smile */}
            <path d="M44 55 Q50 60 56 55" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {gender === 'male' && avatarIndex === 2 && (
          // ================= MALE 2: Executive with Suit & Tie =================
          <g>
            <circle cx="50" cy="50" r="50" fill={`url(#${uid}-bg-boy2)`} />
            {/* Suit & Shirt */}
            <path d="M18 100 C22 75, 36 71, 50 71 C64 71, 78 75, 82 100 Z" fill="#1E293B" />
            <path d="M41 71 L50 92 L59 71 Z" fill="#F8FAFC" />
            {/* Tie: Brand Green 3D Knot */}
            <path d="M48 74 L52 74 L53 88 L50 93 L47 88 Z" fill="#00C87B" />
            {/* Neck */}
            <path d="M44 60 L56 60 L55 72 C50 74, 50 74, 45 72 Z" fill="#DE9E6E" />
            {/* Head */}
            <ellipse cx="50" cy="44" rx="19" ry="22" fill={`url(#${uid}-skin-tan)`} />
            {/* Ears */}
            <circle cx="30" cy="45" r="4.5" fill="#E2A677" />
            <circle cx="70" cy="45" r="4.5" fill="#E2A677" />
            {/* Classic Side-Part Groomed Hair */}
            <path d="M29 39 C30 24, 42 19, 53 20 C64 21, 71 27, 70 38 C64 32, 55 31, 46 32 C38 33, 33 36, 29 39 Z" fill="#18181B" />
            <path d="M38 23 C48 22, 58 24, 64 29" stroke="#3F3F46" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Eyes */}
            <ellipse cx="43" cy="43" rx="2" ry="2.5" fill="#18181B" />
            <ellipse cx="57" cy="43" rx="2" ry="2.5" fill="#18181B" />
            <circle cx="43.7" cy="42.5" r="0.8" fill="#FFF" />
            <circle cx="57.7" cy="42.5" r="0.8" fill="#FFF" />
            {/* Confident Smile */}
            <path d="M45 54 Q50 58 55 54" stroke="#7C2D12" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {gender === 'male' && avatarIndex === 3 && (
          // ================= MALE 3: Warm Creative with Curly Hair & Hoodie =================
          <g>
            <circle cx="50" cy="50" r="50" fill={`url(#${uid}-bg-boy3)`} />
            {/* Terracotta Hoodie */}
            <path d="M20 100 C23 74, 38 71, 50 71 C62 71, 77 74, 80 100 Z" fill="#EA580C" />
            <path d="M38 71 C38 80, 62 80, 62 71 Z" fill="#C2410C" />
            <path d="M47 80 L47 94" stroke="#FED7AA" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M53 80 L53 94" stroke="#FED7AA" strokeWidth="1.5" strokeLinecap="round" />
            {/* Neck */}
            <path d="M44 61 L56 61 L55 72 C50 75, 50 75, 45 72 Z" fill="#F5C197" />
            {/* Head */}
            <ellipse cx="50" cy="45" rx="19.5" ry="22.5" fill={`url(#${uid}-skin-light)`} />
            {/* 3D Curly Hair Volume */}
            <circle cx="34" cy="27" r="7" fill="#451A03" />
            <circle cx="44" cy="23" r="8" fill="#5A2306" />
            <circle cx="56" cy="23" r="8" fill="#5A2306" />
            <circle cx="66" cy="28" r="7" fill="#451A03" />
            <circle cx="30" cy="35" r="6" fill="#451A03" />
            <circle cx="70" cy="35" r="6" fill="#451A03" />
            <circle cx="50" cy="22" r="8.5" fill="#78350F" />
            {/* Eyes */}
            <ellipse cx="43" cy="44" rx="2.2" ry="2.7" fill="#292524" />
            <ellipse cx="57" cy="44" rx="2.2" ry="2.7" fill="#292524" />
            <circle cx="43.8" cy="43.2" r="0.9" fill="#FFF" />
            <circle cx="57.8" cy="43.2" r="0.9" fill="#FFF" />
            {/* Big Friendly Smile */}
            <path d="M43 54 Q50 62 57 54 Z" fill="#9A3412" />
            <path d="M45 54 Q50 56 55 54" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>
        )}

        {gender === 'male' && avatarIndex === 4 && (
          // ================= MALE 4: Sleek Turtleneck with Modern Fade =================
          <g>
            <circle cx="50" cy="50" r="50" fill={`url(#${uid}-bg-boy4)`} />
            {/* Indigo Turtleneck */}
            <path d="M22 100 C25 76, 38 72, 50 72 C62 72, 75 76, 78 100 Z" fill="#312E81" />
            <rect x="42" y="62" width="16" height="14" rx="4" fill="#3730A3" />
            <path d="M42 67 Q50 70 58 67" stroke="#4338CA" strokeWidth="1" fill="none" />
            {/* Head */}
            <ellipse cx="50" cy="44" rx="19.5" ry="22.5" fill={`url(#${uid}-skin-warm)`} />
            {/* Ears */}
            <circle cx="30" cy="45" r="4.5" fill="#F3B98E" />
            <circle cx="70" cy="45" r="4.5" fill="#F3B98E" />
            {/* Modern Fade Undercut */}
            <path d="M30 38 C30 22, 40 18, 50 18 C60 18, 70 22, 70 38 C63 32, 56 29, 50 29 C44 29, 37 32, 30 38 Z" fill="#0F172A" />
            <ellipse cx="50" cy="22" rx="12" ry="3.5" fill="#334155" />
            {/* Eyes */}
            <ellipse cx="43" cy="42" rx="2.2" ry="2.7" fill="#0F172A" />
            <ellipse cx="57" cy="42" rx="2.2" ry="2.7" fill="#0F172A" />
            <circle cx="43.8" cy="41.3" r="0.9" fill="#FFF" />
            <circle cx="57.8" cy="41.3" r="0.9" fill="#FFF" />
            {/* Beard Shadow / Modern Stubble */}
            <path d="M40 50 C40 60, 60 60, 60 50 C58 58, 42 58, 40 50 Z" fill="#9A3412" fillOpacity="0.15" />
            {/* Calm confident smile */}
            <path d="M45 54 Q50 58 55 54" stroke="#7C2D12" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {gender === 'female' && avatarIndex === 0 && (
          // ================= FEMALE 0: Emerald Hijab / Scarf (Silaneh Brand Tone) =================
          <g>
            <circle cx="50" cy="50" r="50" fill={`url(#${uid}-bg-girl0)`} />
            {/* Shoulder wrap */}
            <path d="M18 100 C22 75, 36 68, 50 68 C64 68, 78 75, 82 100 Z" fill="#047857" />
            <path d="M36 78 C44 85, 56 85, 64 78" stroke="#065F46" strokeWidth="2" fill="none" />
            {/* Hijab Base: Volumetric 3D drape around head */}
            <ellipse cx="50" cy="45" rx="24" ry="26" fill="#00C87B" />
            <path d="M26 45 C26 23, 74 23, 74 45 C74 65, 65 72, 50 72 C35 72, 26 65, 26 45 Z" fill="#059669" />
            {/* Inner Face Opening */}
            <ellipse cx="50" cy="47" rx="14.5" ry="17.5" fill={`url(#${uid}-skin-light)`} />
            {/* Hijab fold highlights */}
            <path d="M30 35 C38 27, 62 27, 70 35" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
            {/* Soft Eyes */}
            <ellipse cx="44" cy="46" rx="2.2" ry="2.6" fill="#1C1917" />
            <ellipse cx="56" cy="46" rx="2.2" ry="2.6" fill="#1C1917" />
            <circle cx="44.7" cy="45.2" r="0.9" fill="#FFF" />
            <circle cx="56.7" cy="45.2" r="0.9" fill="#FFF" />
            {/* Eyelashes */}
            <path d="M42 43 Q45 42 47 44" stroke="#0F172A" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            <path d="M53 44 Q55 42 58 43" stroke="#0F172A" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            {/* Blush */}
            <circle cx="40" cy="51" r="3" fill="#F43F5E" fillOpacity="0.25" />
            <circle cx="60" cy="51" r="3" fill="#F43F5E" fillOpacity="0.25" />
            {/* Warm Friendly Smile */}
            <path d="M45 56 Q50 61 55 56" stroke="#BE185D" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {gender === 'female' && avatarIndex === 1 && (
          // ================= FEMALE 1: Modern Tech Leader with Glasses & Sleek Hair =================
          <g>
            <circle cx="50" cy="50" r="50" fill={`url(#${uid}-bg-girl1)`} />
            {/* Violet/Rose Blazer */}
            <path d="M20 100 C24 74, 38 70, 50 70 C62 70, 76 74, 80 100 Z" fill="#9333EA" />
            <path d="M43 70 L50 82 L57 70 Z" fill="#FDF2F8" />
            {/* Neck */}
            <path d="M44 60 L56 60 L55 72 C50 74, 50 74, 45 72 Z" fill="#F5C197" />
            {/* Hair behind shoulders */}
            <path d="M26 45 C26 65, 32 75, 36 78 C30 70, 27 58, 27 45 Z" fill="#18181B" />
            <path d="M74 45 C74 65, 68 75, 64 78 C70 70, 73 58, 73 45 Z" fill="#18181B" />
            {/* Head */}
            <ellipse cx="50" cy="45" rx="18.5" ry="21.5" fill={`url(#${uid}-skin-warm)`} />
            {/* Hair Top / Bob styling with gloss */}
            <path d="M28 38 C28 22, 40 18, 50 18 C60 18, 72 22, 72 38 C66 30, 58 26, 50 26 C42 26, 34 30, 28 38 Z" fill="#27272A" />
            <path d="M38 23 C44 21, 56 21, 62 24" stroke="#52525B" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Chic Rounded Glasses */}
            <circle cx="42" cy="44" r="6" fill="#18181B" />
            <circle cx="58" cy="44" r="6" fill="#18181B" />
            <rect x="47" y="43" width="6" height="1.8" fill="#18181B" />
            <circle cx="42" cy="44" r="4.5" fill="#E0E7FF" fillOpacity="0.4" />
            <circle cx="58" cy="44" r="4.5" fill="#E0E7FF" fillOpacity="0.4" />
            <path d="M40 42 L43 42" stroke="#FFF" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
            <path d="M56 42 L59 42" stroke="#FFF" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
            {/* Blush */}
            <circle cx="36" cy="51" r="3" fill="#F43F5E" fillOpacity="0.25" />
            <circle cx="64" cy="51" r="3" fill="#F43F5E" fillOpacity="0.25" />
            {/* Smile */}
            <path d="M45 56 Q50 60 55 56" stroke="#BE185D" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {gender === 'female' && avatarIndex === 2 && (
          // ================= FEMALE 2: Soft Rose Scarf / Modern Draped Hijab =================
          <g>
            <circle cx="50" cy="50" r="50" fill={`url(#${uid}-bg-girl2)`} />
            {/* Dress */}
            <path d="M18 100 C22 76, 36 70, 50 70 C64 70, 78 76, 82 100 Z" fill="#6366F1" />
            {/* Scarf draped softly */}
            <ellipse cx="50" cy="45" rx="23.5" ry="25.5" fill="#F472B6" />
            <path d="M26 44 C26 23, 74 23, 74 44 C74 65, 64 73, 50 73 C36 73, 26 65, 26 44 Z" fill="#DB2777" />
            <path d="M38 72 C42 84, 46 95, 48 100" stroke="#BE185D" strokeWidth="3" fill="none" />
            {/* Face Opening */}
            <ellipse cx="50" cy="46" rx="14" ry="17" fill={`url(#${uid}-skin-light)`} />
            {/* Highlights on scarf */}
            <path d="M32 32 C40 25, 60 25, 68 32" stroke="#FBCFE8" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
            {/* Eyes */}
            <ellipse cx="44" cy="45" rx="2.2" ry="2.6" fill="#1C1917" />
            <ellipse cx="56" cy="45" rx="2.2" ry="2.6" fill="#1C1917" />
            <circle cx="44.7" cy="44.2" r="0.9" fill="#FFF" />
            <circle cx="56.7" cy="44.2" r="0.9" fill="#FFF" />
            {/* Eyelashes */}
            <path d="M42 42 Q45 41 47 43" stroke="#0F172A" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            <path d="M53 43 Q55 41 58 42" stroke="#0F172A" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            {/* Gentle smile */}
            <path d="M45 55 Q50 60 55 55" stroke="#9D174D" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {gender === 'female' && avatarIndex === 3 && (
          // ================= FEMALE 3: Sleek High Ponytail & Gold Studs =================
          <g>
            <circle cx="50" cy="50" r="50" fill={`url(#${uid}-bg-girl3)`} />
            {/* Top / Blouse in Coral */}
            <path d="M22 100 C25 75, 38 71, 50 71 C62 71, 75 75, 78 100 Z" fill="#F43F5E" />
            <path d="M43 71 C43 77, 57 77, 57 71 Z" fill="#E11D48" />
            {/* High Ponytail sticking up/right */}
            <path d="M58 24 C68 20, 78 28, 76 42 C72 40, 68 32, 60 28 Z" fill="#292524" />
            <circle cx="58" cy="25" r="3.5" fill="#00C87B" />
            {/* Neck */}
            <path d="M44 60 L56 60 L55 72 C50 75, 50 75, 45 72 Z" fill="#DE9E6E" />
            {/* Head */}
            <ellipse cx="50" cy="45" rx="18.5" ry="21.5" fill={`url(#${uid}-skin-tan)`} />
            {/* Ears with Gold Studs */}
            <circle cx="31" cy="47" r="4" fill="#E2A677" />
            <circle cx="31" cy="48" r="1.5" fill="#FBBF24" />
            <circle cx="69" cy="47" r="4" fill="#E2A677" />
            <circle cx="69" cy="48" r="1.5" fill="#FBBF24" />
            {/* Sleek pulled-back hair */}
            <path d="M31 38 C31 23, 40 18, 50 18 C60 18, 69 23, 69 38 C64 30, 56 27, 50 27 C44 27, 36 30, 31 38 Z" fill="#3F3F46" />
            <path d="M40 23 C46 20, 54 20, 60 23" stroke="#71717A" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Eyes */}
            <ellipse cx="43" cy="44" rx="2.2" ry="2.7" fill="#18181B" />
            <ellipse cx="57" cy="44" rx="2.2" ry="2.7" fill="#18181B" />
            <circle cx="43.8" cy="43.2" r="0.9" fill="#FFF" />
            <circle cx="57.8" cy="43.2" r="0.9" fill="#FFF" />
            {/* Radiant Smile */}
            <path d="M44 54 Q50 61 56 54 Z" fill="#9F1239" />
            <path d="M46 54 Q50 56 54 54" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>
        )}

        {gender === 'female' && avatarIndex === 4 && (
          // ================= FEMALE 4: Professional Bob / Creative Waves =================
          <g>
            <circle cx="50" cy="50" r="50" fill={`url(#${uid}-bg-girl4)`} />
            {/* Professional Azure Blazer */}
            <path d="M20 100 C24 74, 38 70, 50 70 C62 70, 76 74, 80 100 Z" fill="#0284C7" />
            <path d="M42 70 L50 84 L58 70 Z" fill="#FFFFFF" />
            {/* Wavy hair framing */}
            <path d="M26 42 C24 58, 28 72, 33 76 C28 68, 27 54, 28 42 Z" fill="#451A03" />
            <path d="M74 42 C76 58, 72 72, 67 76 C72 68, 73 54, 72 42 Z" fill="#451A03" />
            {/* Neck */}
            <path d="M44 60 L56 60 L55 72 C50 74, 50 74, 45 72 Z" fill="#F5C197" />
            {/* Head */}
            <ellipse cx="50" cy="45" rx="18.5" ry="21.5" fill={`url(#${uid}-skin-light)`} />
            {/* Hair Top & Soft Curls */}
            <path d="M28 38 C28 23, 38 18, 50 18 C62 18, 72 23, 72 38 C65 30, 58 26, 50 26 C42 26, 35 30, 28 38 Z" fill="#5A2306" />
            <path d="M36 23 C44 20, 56 20, 64 23" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Eyes */}
            <ellipse cx="43" cy="44" rx="2.2" ry="2.7" fill="#1C1917" />
            <ellipse cx="57" cy="44" rx="2.2" ry="2.7" fill="#1C1917" />
            <circle cx="43.8" cy="43.2" r="0.9" fill="#FFF" />
            <circle cx="57.8" cy="43.2" r="0.9" fill="#FFF" />
            {/* Brows */}
            <path d="M40 39 Q43 37 46 39" stroke="#451A03" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M54 39 Q57 37 60 39" stroke="#451A03" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            {/* Blush */}
            <circle cx="37" cy="51" r="3.5" fill="#F43F5E" fillOpacity="0.25" />
            <circle cx="63" cy="51" r="3.5" fill="#F43F5E" fillOpacity="0.25" />
            {/* Smile */}
            <path d="M44 55 Q50 60 56 55" stroke="#BE123C" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* Global 3D Glass / Specular Arc across the avatar */}
        <path
          d="M10 30 C20 10, 80 10, 90 30 C75 20, 25 20, 10 30 Z"
          fill={`url(#${uid}-specular)`}
        />
      </svg>
    </div>
  );
};
