import React, { useState, useCallback, useMemo } from 'react';
import 'jszip';
import { Quality, Preset, ImageInput } from '../types';
import { generateFourImages, analyzeImageAndSuggestStyles } from '../services/geminiService';
import Spinner from './Spinner';
import { Tab } from '../types';

declare const JSZip: any;

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
);

const initialPresets: Preset[] = [
    {
        id: 'cong-so-blazer-fitted',
        name: 'Blazer fitted + Quần ống đứng',
        industry: 'Công sở',
        ageGroup: 'Nữ',
        characterPrompt: 'Blazer fitted + quần ống đứng couture Dior/Chanel/LV; studio xám; 8K, sang hiện đại. Giữ nguyên khuôn mặt.. Aspect ratio 3:4. Image quality ultra. Thần thái K-fashion hiện đại, sang trọng, dáng mềm mại, cổ tay tinh tế, Trang phục couture từ Dior, Chanel, Louis Vuitton, Hermès, Valentino (tweed dệt tinh xảo, len Ý super 120s, satin lụa premium, da thật hoàn thiện tỉ mỉ), Giá trị set đồ trên 2 tỷ VND (ẩn), may đo chuẩn couture, tôn dáng tỉ lệ vàng, Ánh sáng điện ảnh Hàn: soft key + fill nhẹ, backlight mờ ảo, màu phim hiện đại, da tự nhiên, Độ chi tiết 8K, xử lý tóc – bề mặt vải tinh xảo, màu sắc tinh gọn, Giữ nguyên khuôn mặt tham chiếu (Face Consistency)',
        actionPrompt: ''
    },
    {
        id: 'cong-so-vest-navy',
        name: 'Vest navy couture',
        industry: 'Công sở',
        ageGroup: 'Nữ',
        characterPrompt: 'Vest navy couture (len Ý super 120s), áo lụa cổ V; hành lang kính; 8K, quyền lực kín đáo. Giữ nguyên khuôn mặt.. Aspect ratio 3:4. Image quality ultra. Thần thái K-fashion hiện đại, sang trọng, dáng mềm mại, cổ tay tinh tế, Trang phục couture từ Dior, Chanel, Louis Vuitton, Hermès, Valentino (tweed dệt tinh xảo, len Ý super 120s, satin lụa premium, da thật hoàn thiện tỉ mỉ), Giá trị set đồ trên 2 tỷ VND (ẩn), may đo chuẩn couture, tôn dáng tỉ lệ vàng, Ánh sáng điện ảnh Hàn: soft key + fill nhẹ, backlight mờ ảo, màu phim hiện đại, da tự nhiên, Độ chi tiết 8K, xử lý tóc – bề mặt vải tinh xảo, màu sắc tinh gọn, Giữ nguyên khuôn mặt tham chiếu (Face Consistency)',
        actionPrompt: ''
    },
    {
        id: 'cong-so-mang-to-camel',
        name: 'Măng tô camel cashmere',
        industry: 'Công sở',
        ageGroup: 'Nữ',
        characterPrompt: 'Măng tô camel cashmere; phố thu Seoul; 8K, điện ảnh ấm. Giữ nguyên khuôn mặt.. Aspect ratio 3:4. Image quality ultra. Thần thái K-fashion hiện đại, sang trọng, dáng mềm mại, cổ tay tinh tế, Trang phục couture từ Dior, Chanel, Louis Vuitton, Hermès, Valentino (tweed dệt tinh xảo, len Ý super 120s, satin lụa premium, da thật hoàn thiện tỉ mỉ), Giá trị set đồ trên 2 tỷ VND (ẩn), may đo chuẩn couture, tôn dáng tỉ lệ vàng, Ánh sáng điện ảnh Hàn: soft key + fill nhẹ, backlight mờ ảo, màu phim hiện đại, da tự nhiên, Độ chi tiết 8K, xử lý tóc – bề mặt vải tinh xảo, màu sắc tinh gọn, Giữ nguyên khuôn mặt tham chiếu (Face Consistency)',
        actionPrompt: ''
    },
    {
        id: 'cong-so-set-tweed',
        name: 'Set tweed sáng',
        industry: 'Công sở',
        ageGroup: 'Nữ',
        characterPrompt: 'Set tweed sáng + áo lụa; 8K quý phái. Giữ nguyên khuôn mặt.. Aspect ratio 3:4. Image quality ultra. Thần thái K-fashion hiện đại, sang trọng, dáng mềm mại, cổ tay tinh tế, Trang phục couture từ Dior, Chanel, Louis Vuitton, Hermès, Valentino (tweed dệt tinh xảo, len Ý super 120s, satin lụa premium, da thật hoàn thiện tỉ mỉ), Giá trị set đồ trên 2 tỷ VND (ẩn), may đo chuẩn couture, tôn dáng tỉ lệ vàng, Ánh sáng điện ảnh Hàn: soft key + fill nhẹ, backlight mờ ảo, màu phim hiện đại, da tự nhiên, Độ chi tiết 8K, xử lý tóc – bề mặt vải tinh xảo, màu sắc tinh gọn, Giữ nguyên khuôn mặt tham chiếu (Face Consistency)',
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-giam-doc',
        name: 'Giám Đốc',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: 'A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed as a tiny businessman, wearing a mini black suit, white shirt, and a cute tie, sitting confidently on a stylish baby-sized chair. Use the uploaded baby face exactly as it is — do not change any facial features.',
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-dau-bep',
        name: 'Đầu bếp',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: 'A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed as a baby chef, wearing a small white chef uniform and a big floppy chef hat. Use the uploaded baby face exactly as it is — do not change any facial features.',
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-vo-si',
        name: 'Võ sĩ',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: 'A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed as a mini martial artist, wearing a tiny white karate/taekwondo uniform with a black belt tied.',
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-hoa-si',
        name: 'Họa Sĩ',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: "A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed as a little artist. He wears a small beret, a loose paint-splattered shirt, and holds a tiny painter's palette.",
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-phi-cong',
        name: 'Phi Công',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: 'A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed as a tiny airline pilot, wearing a white pilot shirt with mini shoulder stripes, a dark tie, and a cute pilot hat.',
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-cong-an',
        name: 'Công An',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: 'A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed in a miniature green Vietnamese police uniform with red epaulettes and a matching cap.',
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-bac-sy',
        name: 'Bác Sỹ',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: "A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed as a little doctor. He wears a small white lab coat, light blue shirt, and a tiny toy stethoscope.",
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-cuu-hoa',
        name: 'Cứu hỏa',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: 'A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed as a cute little firefighter. He wears a tiny bright red firefighter outfit with reflective strips and a mini helmet, sitting or standing on a clean white studio floor. Use the uploaded baby face exactly as it is — do not change any facial features.',
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-hai-quan',
        name: 'Hải Quân',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: 'A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed as a cute sailor. He wears a white and navy blue sailor outfit with a matching cap and ribbon tie. Use the uploaded baby face exactly as it is — do not change any facial features.',
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-phi-hanh-gia',
        name: 'Phi Hành Gia',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: 'A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed as a tiny astronaut. He wears a miniature white space suit with authentic patches and a round space helmet. Use the uploaded baby face exactly as it is — do not change any facial features.',
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-shipper-xanhsm',
        name: 'Shipper (XanhSM)',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: 'A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed as an XanhSM motorbike driver. He wears a tiny blue XanhSM driver jacket with the company logo and a matching blue helmet. Use the uploaded baby face exactly as it is — do not change any facial features.',
        actionPrompt: ''
    },
    {
        id: 'nghe-nghiep-grab',
        name: 'Grab',
        industry: 'Nghề nghiệp',
        ageGroup: 'Bé (0-12 tháng)',
        characterPrompt: 'A hyper-realistic studio portrait of a 1-year-old Vietnamese baby boy dressed as a Grab motorbike driver. He wears a tiny green Grab jacket with white stripes and a matching Grab helmet. Use the uploaded baby face exactly as it is — do not change any facial features.',
        actionPrompt: ''
    },
    {
        id: 'studio-be-ngoi-ghe',
        name: 'Bé ngồi ghế',
        industry: 'Studio',
        ageGroup: 'Bé gái',
        characterPrompt: "Keep the girl's original face, skin tone, and wavy hair on both sides exactly as in the uploaded image, without altering any facial or hair features. She is sitting on a light wooden chair next to a small round table, gently resting her chin on her hand with a natural and relaxed expression. Behind her is a colorful wall filled with anime posters, creating a cheerful and lively atmosphere.",
        actionPrompt: ''
    },
    {
        id: 'studio-khoi-hop-tim',
        name: 'Khối hộp màu tím pastel',
        industry: 'Studio',
        ageGroup: 'Bé gái',
        characterPrompt: "Keep the girl's original face, skin tone, and hairstyle exactly as in the uploaded image, without changing any facial or hair features. The girl is sitting naturally on a pastel purple cube, under soft studio lighting, with a centered composition and an overall gentle, modern color tone. She is wearing an oversized denim jacket paired with matching light blue jeans.",
        actionPrompt: ''
    },
    {
        id: 'studio-hong-pastel',
        name: 'Studio màu hồng pastel',
        industry: 'Studio',
        ageGroup: 'Bé gái',
        characterPrompt: "Keep the girl's original face, skin tone, and hairstyle exactly as in the uploaded image, without changing any facial or hair features. The girl is sitting neatly in a pastel pink studio setting with a smooth, seamless background, surrounded by floating pink and white balloons. Next to her is a small white table holding a light pink tiered birthday cake decorated with white cream edges. She is wearing a layered princess dress made of tulle with soft shimmering pastel pink.",
        actionPrompt: ''
    },
    {
        id: 'studio-be-dung-nen-trang',
        name: 'Bé đứng trước nền trắng sáng',
        industry: 'Studio',
        ageGroup: 'Bé gái',
        characterPrompt: "Keep the girl's original face, skin tone, and hairstyle exactly as in the uploaded image, without changing any facial or hair features. The girl is standing in front of a bright white studio background under soft, even lighting, with a clean and natural pastel tone. She is wearing a pastel pink princess dress with layered tulle puff sleeves, creating a delicate and graceful effect.",
        actionPrompt: ''
    },
    {
        id: 'studio-be-ngoi-ghe-go',
        name: 'Bé ngồi trên ghế gỗ màu trắng sáng',
        industry: 'Studio',
        ageGroup: 'Bé gái',
        characterPrompt: "Keep the girl's original face, skin tone, and hairstyle exactly as in the uploaded image, without changing any facial or hair features. The girl is sitting on a bright white wooden chair in a minimalist white room, with natural light softly streaming in from a side window on the left, creating a pure and gentle atmosphere.",
        actionPrompt: ''
    },
    {
        id: 'studio-be-ngoi-san-go',
        name: 'Bé ngồi trên sàn gỗ sáng',
        industry: 'Studio',
        ageGroup: 'Bé gái',
        characterPrompt: "Keep the girl's original face, skin tone, and hairstyle exactly as in the uploaded image, without changing any facial or hair features. The girl is sitting gracefully on a light wooden floor in a minimalist white room, illuminated by soft natural light coming diagonally from a window on the left, creating a gentle and pure atmosphere.",
        actionPrompt: ''
    },
    {
        id: 'trung-thu-ngoi-canh-banh',
        name: 'Bé gái ngồi cạnh bánh trung thu',
        industry: 'Lễ hội',
        ageGroup: 'Bé gái',
        characterPrompt: "Keep the girl's original face, skin tone, and hairstyle exactly as in the uploaded image, without changing any facial or hair features. A festive Mid-Autumn portrait of a little girl sitting gracefully against a deep red background (use upload photo). She has a slim, delicate figure and is dressed in a red halter-neck dress with layered fabric and a flowing white skirt underneath.",
        actionPrompt: ''
    },
    {
        id: 'trung-thu-ngoi-ghe-cam-long-den',
        name: 'Ngồi ghế cầm lòng đèn',
        industry: 'Lễ hội',
        ageGroup: 'Trẻ em',
        characterPrompt: "Keep the child's original face, skin tone, and hairstyle exactly as in the uploaded image, without changing any facial or hair features. A traditional Mid-Autumn Festival portrait of a young child sitting on a wooden chair in a festive indoor setup. The child is dressed in a simple brown áo bà ba outfit with buttoned top and loose pants, paired with a black-and-white checkered khăn rằn tied around the head.",
        actionPrompt: ''
    },
    {
        id: 'trung-thu-dung-canh-trong',
        name: 'Bé đứng cạnh trống',
        industry: 'Lễ hội',
        ageGroup: 'Bé trai',
        characterPrompt: "A full-body portrait of a young boy in a Mid-Autumn Festival setting, dressed in a traditional Vietnamese festive outfit. He is wearing a white cross-collar shirt with a lion head embroidery on the chest, paired with bright red shorts and a matching red cap. Use the uploaded baby face exactly as it is — do not change any facial features.",
        actionPrompt: ''
    },
    {
        id: 'trung-thu-ngoi-ghe-dau-lan',
        name: 'Bé ngồi ghế + đầu lân',
        industry: 'Lễ hội',
        ageGroup: 'Bé trai',
        characterPrompt: "A full-body portrait of a young boy in traditional Vietnamese attire, sitting on a small bamboo bench in a festive Mid-Autumn setting. He is wearing a beige ao dai (long tunic) with simple brown trousers, paired with a classic black turban-style headpiece. Use the uploaded baby face exactly as it is — do not change any facial features.",
        actionPrompt: ''
    },
    {
        id: 'trung-thu-mua-duoi-trang',
        name: 'Bé múa dưới trăng',
        industry: 'Lễ hội',
        ageGroup: 'Bé gái',
        characterPrompt: "A little girl (use upload photo) in a red traditional festive outfit is standing barefoot on a giant mooncake stage. She is gracefully raising her right arm, holding a small lantern, with her left arm extended sideways like dancing. Her outfit is a deep red halter dress. Keep the girl's original face, skin tone, and hairstyle exactly as in the uploaded image, without changing any facial or hair features.",
        actionPrompt: ''
    },
    {
        id: 'trung-thu-vui-cung-trang',
        name: 'Bé vui cùng trăng',
        industry: 'Lễ hội',
        ageGroup: 'Trẻ em',
        characterPrompt: "A full-body portrait of a young child dressed in a traditional red festive outfit for Mid-Autumn Festival. The outfit is a sleeveless red halter-top with a decorative floral emblem at the chest, paired with a flowing red skirt layered with white fabric. Keep the original face, skin tone, and hairstyle exactly as in the uploaded image, without changing any facial or hair features.",
        actionPrompt: ''
    },
    {
        id: 'trung-thu-cam-long-den',
        name: 'Bé cầm lồng đèn',
        industry: 'Lễ hội',
        ageGroup: 'Bé gái',
        characterPrompt: "A warm and festive Mid-Autumn Festival portrait of a little girl (use upload photo) sitting on a traditional wooden bench. She is wearing a vibrant áo yếm with a golden yellow embroidered bodice featuring intricate floral and phoenix patterns, paired with a flowing black silk skirt. Her hair is styled in two neat braids tied with red ribbons, giving a playful and traditional vibe.",
        actionPrompt: ''
    },
    // New Presets Start Here
    {
        id: 'an-uong-du-lich-cafe-trong-nha',
        name: 'Quán Café trong nhà',
        industry: 'Ăn uống + Du lịch',
        ageGroup: 'Nữ',
        characterPrompt: 'An elegant woman (keep her face and hairstyle exactly as in the attached image) posing for a professional fashion photoshoot at a modern café in Vietnam. She is wearing a light blue button-up shirt and light blue straight-leg jeans with rolled cuffs, with sunglasses hooked onto one of the shirt buttons. The woman is wearing white high heels and holding a handbag with a gold chain strap. In front of her is a wooden table with a Starbucks coffee cup and a vase containing a single red rose.',
        actionPrompt: ''
    },
    {
        id: 'an-uong-du-lich-cafe-ngoai-troi',
        name: 'Quán Café Ngoài trời',
        industry: 'Ăn uống + Du lịch',
        ageGroup: 'Nữ',
        characterPrompt: "A photo of a woman (keep her face and hairstyle exactly as in the attached image) wearing a white cardigan and white trousers, sitting on a Starbucks chair at night. She poses gracefully and smiles gently while a Starbucks drink with a straw sits on the table beside a white Dior handbag. She wears elegant gold accessories — a necklace, earrings, and a bracelet — along with a wristwatch, completing her effortless resort-chic look.\n\nThe background features a Starbucks café with its recognizable roof design, surrounded by tropical elements and a warm, relaxed atmosphere. The scene is illuminated with bright, natural lighting that evokes a cozy tropical evening mood. Captured in various sitting poses, the image conveys a sense of casual elegance and tranquil style.",
        actionPrompt: ''
    },
    {
        id: 'an-uong-du-lich-trung-tam-mua-sam',
        name: 'Trung tâm mua sắm',
        industry: 'Ăn uống + Du lịch',
        ageGroup: 'Nữ',
        characterPrompt: 'A full-body photo of a young woman (keep her face and hairstyle exactly as in the attached image) standing in front of a shopping mall, posing naturally with a playful, cheerful, and cute model-like expression. She has black hair with a few strands blowing across her face in the wind. She is wearing a short-sleeved T-shirt with white and sky-blue stripes, paired with a dark blue denim A-line skirt that falls just above the knees and features a lace detail on the front. She is wearing white sneakers. One hand is holding a Starbucks coffee cup, while the other seems to hold a smartphone and a small white wallet. Behind her is a modern building with large glass windows reflecting the light. The warm late-afternoon sunlight highlights the details of her outfit and figure.',
        actionPrompt: ''
    },
    {
        id: 'an-uong-du-lich-khi-troi-oto',
        name: 'Thưởng thức khí trời trên otô',
        industry: 'Ăn uống + Du lịch',
        ageGroup: 'Nữ',
        characterPrompt: "An artistic outdoor portrait in editorial fashion photography style. A beautiful Asian woman (keep her face and hairstyle exactly as in the attached image) leaning gracefully out of a car on a mountain road, posing in the wind. Her black hair flows gently in the breeze. She is wearing a light beige knitted sweater with ruffle details. Her expression is calm and serene. It's a sunny day with a blue sky and soft white clouds, and lush green hills form the background. The scene features cinematic lighting, natural color tones, and a softly focused backdrop. Captured in a candid, travel-photography style with high detail and 8K resolution.",
        actionPrompt: ''
    },
    {
        id: 'an-uong-du-lich-tuong-cay-xanh',
        name: 'Bên bức tường + hàng cây xanh',
        industry: 'Ăn uống + Du lịch',
        ageGroup: 'Nữ',
        characterPrompt: "A young, beautiful Asian woman (keep her face and hairstyle exactly as in the attached image) smiling softly and posing gracefully like a model on a serene, endless road surrounded by a warm, natural atmosphere. She is wearing an elegant short cream-colored dress paired with shiny black Mary Jane shoes. Her smile is radiant, and her eyes shine with happiness.\n\nBehind her is a concrete road bordered on one side by a rustic wooden wall. The path is covered by a lush green canopy, forming a natural tunnel. Sunlight filters through the leaves, casting beautiful patterns of light and shadow on the ground and surrounding details.\n\nTo the left of the frame, a small wooden house with unique architecture is nestled among green trees. Decorative plants are arranged harmoniously, creating a refreshing and peaceful ambiance. The blue sky with a few soft clouds evokes a bright, pleasant sunny day. The image carries a warm, cheerful tone that reflects tranquility and the beauty of nature.",
        actionPrompt: ''
    },
    {
        id: 'an-uong-du-lich-view-troi-may',
        name: 'View trời mây',
        industry: 'Ăn uống + Du lịch',
        ageGroup: 'Nữ',
        characterPrompt: "Take a photo of a girl (face, hair as attached) standing on a wooden balcony or observatory, seemingly in a very high place because below is a sea of white clouds stretching to the horizon, and the blue sky is very clear and bright. black sunglasses in her hair. She is wearing a pearl white turtleneck and light blue skinny jeans, wearing a pair of black leather thigh-high boots with pointed heels. The girl stands posing by the dark wooden railing of the observatory, elegantly posing, one leg bent, one leg stretched. The railing has vertical and diagonal wooden bars forming an X shape. The platform is also made of wood. Good lighting, highlighting the girl and the majestic scenery behind her.",
        actionPrompt: ''
    },
    {
        id: 'an-uong-du-lich-vong-trang',
        name: 'Nắng nhẹ trên võng trắng',
        industry: 'Ăn uống + Du lịch',
        ageGroup: 'Nữ',
        characterPrompt: "Hyperrealistic portrait of a young woman (keep her face and hairstyle exactly as in the attached image) with soft, flowing caramel-brown hair that shines gently under the sun. A few loose strands dance across her face, adding a natural and dreamy touch. Her lips are a soft, delicate orange — feminine, tender, and evoking an innocent warmth. She is wearing a bright yellow tank top with a cream gradient cardigan and white denim shorts, creating a light and breezy summer vibe.\n\nShe gently holds a woven bag in one hand and slightly pulls up her sleeve. The girl sits cross-legged on a white woven hammock by the sea. The ocean is crystal blue, the sand pure white, and blooming frangipani trees frame the background. Soft, natural sunlight casts a warm glow and subtle shadows on her face, enhancing the dreamy, serene, and cinematic atmosphere.\n\nStyle: Hyperrealistic, 8K, soft focus, cinematic lighting, warm color grading, shallow depth of field, gentle summer tones.",
        actionPrompt: ''
    },
    {
        id: 'an-uong-du-lich-binh-minh-hoang-hon',
        name: 'Bình Minh + Hoàng Hôn',
        industry: 'Ăn uống + Du lịch',
        ageGroup: 'Nữ',
        characterPrompt: "The woman (face, hair as attached photo) is wearing a silk two-piece: a backless cream silk crop top and a long silk skirt fluttering in the wind. She stands by the seashore at sunset, facing the camera with a calm, confident posture. Her posture is elegant and natural, one hand gently holding the skirt while the other hand is placed gently on the hip or waist, just like a professional fashion photo shoot. The bright yellow sunlight shines on her smooth skin, and the soft flash highlights the shimmer of the silk fabric and her delicate figure. Additional keywords: elegant, fresh, radiant skin, portrait, sweet natural light, gentle, soft, smooth and radiant skin. Highlights: detailed facial features with a smooth, luminous base, natural makeup, expressive, sharp eyes, well-groomed eyebrows, soft blush and natural pink lips.",
        actionPrompt: ''
    },
    {
        id: 'an-uong-du-lich-xich-du-bien',
        name: 'Ngồi xích đu ngoài biển',
        industry: 'Ăn uống + Du lịch',
        ageGroup: 'Nữ',
        characterPrompt: "A beautiful young woman (keep her face and hairstyle exactly as in the attached image) wearing a modest white áo dài sits gracefully on a white wooden swing by a sunny tropical beach. A few strands of her hair flow gently in the breeze as she lightly holds the swing's rope. The turquoise sea behind her is calm and clear, with soft golden sand beneath and a vivid blue sky dotted with white clouds. A palm tree can be seen in the distance. The bright, natural sunlight creates a fresh and peaceful atmosphere. Full-body portrait style, vibrant colors, high detail, sharp focal highlights.",
        actionPrompt: ''
    },
    {
        id: 'an-uong-du-lich-thap-nghieng',
        name: 'Tháp Nghiêng',
        industry: 'Ăn uống + Du lịch',
        ageGroup: 'Nữ',
        characterPrompt: "A hyperrealistic full-body portrait in 8K resolution (keep her face and hairstyle exactly as in the attached image), sharp focus with no background blur, smooth and natural skin texture. The wide-angle shot highlights the Leaning Tower of Pisa in the background. The woman is wearing a yellow gradient crew-neck T-shirt, a long pleated skirt, and white sneakers. She is holding a Gucci handbag. She stands facing the camera, smiling softly with her head slightly tilted, gently holding her hair with one hand. The lighting is natural daylight, capturing realistic details and vibrant colors in a balanced, lifelike composition.",
        actionPrompt: ''
    },
    {
        id: 'quy-phai-gio-dong',
        name: 'Gió đông',
        industry: 'Quý Phái - Sang trọng',
        ageGroup: 'Nữ',
        characterPrompt: "A young Asian woman (keep her face and hairstyle exactly as in the attached image) with black hair and a few strands gently blowing across her face, standing and dancing gracefully like a model on a grand, bright stone staircase. She smiles softly and looks directly at the viewer.\n\nShe is wearing an elegant cream-colored outfit - a light, long-sleeved ruffled blouse with a small matching flower pinned at the collar, a fitted vest with subtle patterns layered over it, and a long flowing skirt that sways in the breeze. Her left hand holds a light brown leather handbag, and she wears matching light brown high heels.\n\nThe background highlights the graceful stone staircase and distant classical architecture under a clear blue sky. The lighting is soft and natural, enhancing the refined, timeless, and graceful atmosphere of the scene.",
        actionPrompt: ''
    },
    {
        id: 'quy-phai-sac-do-tinh-te',
        name: 'Sắc đỏ của sự tinh tế',
        industry: 'Quý Phái - Sang trọng',
        ageGroup: 'Nữ',
        characterPrompt: "A portrait of a young, beautiful Asian fashion model (keep her face and hairstyle exactly as in the attached image) posing like a high-fashion magazine model. Her black hair has a few strands gently blowing across her face.\n\nShe is wearing an elegant deep burgundy red evening coat with a modest, refined design that drapes gracefully over her shoulders. The dress beneath is made of structured fabric, adding sophistication and texture. She holds a small matching burgundy handbag delicately in front of her.\n\nThe background is softly blurred, depicting a shopping mall setting that enhances the model's presence and the rich tones of her outfit. Soft, focused lighting highlights her face and clothing, creating a luxurious and professional fashion-photography atmosphere.",
        actionPrompt: ''
    },
    {
        id: 'quy-phai-sac-hong-hoai-niem',
        name: 'Sắc hồng hoài niệm bên xe đạp',
        industry: 'Quý Phái - Sang trọng',
        ageGroup: 'Nữ',
        characterPrompt: "A young Asian woman (keep her face and hairstyle exactly as in the attached image) stands gracefully beside a vintage bicycle. She is wearing a soft pink traditional Vietnamese two-piece outfit with long sleeves and wide-leg trousers. Her right hand rests gently on the bicycle seat while holding a small woven handbag. She smiles warmly and looks directly at the viewer.\n\nThe setting is an outdoor urban scene with a softly blurred background - possibly a small shop or market stall displaying various goods on shelves or walls. Green plants hang from above, adding a touch of nature. The lighting is soft and natural, highlighting the woman and the bicycle. The image conveys a warm, nostalgic aesthetic with a gentle and sentimental mood.",
        actionPrompt: ''
    },
    {
        id: 'quy-phai-hoa-loa-ken-trang',
        name: 'Hoa loa kèn trắng',
        industry: 'Quý Phái - Sang trọng',
        ageGroup: 'Nữ',
        characterPrompt: "A medium shot of an Asian woman (face, hair as attached) standing outdoors on a paved road, wearing a white off-the-shoulder top and a bright red pencil skirt. In her hand, she holds a large bouquet of white calla lilies with prominent green stems, held low in front of her. The background is softly blurred, revealing a tree-lined street with lush green foliage overhead, and a few cars (some silver, some dark) driving in the distance, evoking an urban or suburban setting. The light is natural and bright, highlighting her face and the flowers.",
        actionPrompt: ''
    },
    {
        id: 'quy-phai-quyen-ru-hoa-ruc-ro',
        name: 'Vẻ quyến rũ giữa sắc hoa rực rỡ',
        industry: 'Quý Phái - Sang trọng',
        ageGroup: 'Nữ',
        characterPrompt: "A young woman (keep her face and hairstyle exactly as in the attached image) sits elegantly on a luxurious chair. She gazes directly into the camera with a confident and alluring expression. Her makeup is refined, featuring peachy blush, soft lipstick, and delicate eyeliner. She wears a gold necklace with a unique pendant, gold rings on her fingers, and small elegant earrings.\n\nShe is dressed in a sleeveless white button-up blouse paired with a long pleated skirt printed with vibrant floral patterns in red, yellow, purple, and green. The backdrop is a tastefully decorated room with ivory curtains and soft natural lighting, creating a warm and sophisticated atmosphere.",
        actionPrompt: ''
    },
    {
        id: 'pha-cach-ve-dep-tu-nhien',
        name: 'Vẻ đẹp tự nhiên ánh sáng tinh khôi',
        industry: 'Phá Cách',
        ageGroup: 'Nữ',
        characterPrompt: "A portrait of a young woman (keep her face and hairstyle exactly as in the attached image) with softly wavy, layered hair featuring subtle golden highlights. She poses professionally, gazing directly into the camera with soulful eyes, a few loose strands of hair falling gently across her forehead.\n\nShe is wearing a simple white T-shirt and white jeans. Natural light from the left softly illuminates her face, creating gentle shadows that emphasize her facial features. The background is a plain, neutral wall that adds warmth without distraction. The overall composition is minimalist, focusing on the woman's natural beauty and authentic expression.",
        actionPrompt: ''
    },
    {
        id: 'pha-cach-streetwear-hien-dai',
        name: 'Sắc trắng quyến rũ streetwear',
        industry: 'Phá Cách',
        ageGroup: 'Nữ',
        characterPrompt: "A young, beautiful woman (keep her face and hairstyle exactly as in the attached image) with porcelain skin, red lips, and captivating eyes enhanced by light, natural makeup. She is wearing a white tube top paired with dark denim overalls — slightly distressed at the knees, with one strap casually unfastened. She accessorizes with layered silver necklaces and silver metal cuffs on both wrists.\n\nThe background is minimalist and uniform in dark gray or black, highlighting the subject. The lighting is soft and evenly distributed from the front or slightly diffused, accentuating the textures of her outfit and the contours of her face. She stands confidently, posing professionally with her eyes looking directly into the camera.\n\nHigh-quality, realistic photography with shallow depth of field focused on the model. Style: Modern streetwear, subtly seductive, confident, and contemporary. Tone: Muted and dark, with the white top and red lips serving as vivid focal points.",
        actionPrompt: ''
    },
    {
        id: 'pha-cach-nu-cuoi-tinh-nghich',
        name: 'Nụ cười tinh nghịch quán cà phê',
        industry: 'Phá Cách',
        ageGroup: 'Nữ',
        characterPrompt: "A girl (keep her face and hairstyle exactly as in the attached image) with fair skin, wearing a yellow T-shirt printed with a Doraemon cartoon on the side, denim overalls, and yellow-and-white sneakers.\n\nThe scene is set in a café with a soft blue-and-white color tone. On the table in front of her are a blue-colored juice and a small dessert. She sits with her chin resting on her hand, smiling brightly with a playful, mischievous expression.\n\nLighting: soft, natural softbox illumination. Style: warm cinematic film tone. Lens: 85mm portrait focus. The image should feel cozy, youthful, and vibrant — capturing a spontaneous and cheerful café moment.",
        actionPrompt: ''
    },
    {
        id: 'pha-cach-thanh-lich-am-ap',
        name: 'Thanh lịch ấm áp trong góc nhỏ',
        industry: 'Phá Cách',
        ageGroup: 'Nữ',
        characterPrompt: "A vibrant indoor photo of a young woman (keep her face and hairstyle exactly as in the attached image) sitting inside a round wooden wall nook, surrounded by hanging plants and warm neon lights, with a large white sphere as a visual centerpiece.\n\nOutfit: A graceful pearl-white knitted sweater paired with a long brown pleated skirt, a white Apple Watch, and stylish white sneakers. Accessories include delicate rings or earrings that add a subtle fashion touch.\n\nPose: Full-body, relaxed and comfortable, with her head slightly tilted downward, holding a small bouquet of flowers in one hand. Her makeup is natural, highlighting her soft facial features.\n\nSetting: A cozy, modern café interior decorated with flowers, warm neon lighting, and gentle illumination that enhances the inviting atmosphere.\n\nMood: Bright, cheerful, stylish, and warm — reflecting elegant simplicity and a feminine urban lifestyle.",
        actionPrompt: ''
    },
    {
        id: 'pha-cach-sac-sao-giua-sac-do',
        name: 'Sắc sảo giữa sắc đỏ',
        industry: 'Phá Cách',
        ageGroup: 'Nữ',
        characterPrompt: "A full-body studio portrait of a confident young woman (keep her face and hairstyle exactly as in the attached image) standing against a deep red background. The lighting is soft yet moody, creating a sense of depth and allure.\n\nShe wears a gray knitted crop top paired with loose black ripped khaki pants and a sleek, modern designer bracelet. Her pose is natural and stylish — one hand in her pocket, the other gently placed behind her hair.\n\nHer expression exudes confidence and individuality, with a mysterious edge. Style: Sharp, fashion-forward, and subtly enigmatic. Lighting: Gentle and atmospheric, highlighting the contours of her face and outfit.",
        actionPrompt: ''
    },
    {
        id: 'pha-cach-ca-tinh-hoai-niem',
        name: 'Cá tính giữa không gian hoài niệm',
        industry: 'Phá Cách',
        ageGroup: 'Nữ',
        characterPrompt: "A young woman (keep her face and hairstyle exactly as in the attached image) sits comfortably on a chair, leaning slightly back. She is wearing a superhero-style crop top, wide-leg ripped jeans, and white sneakers. She has a slim figure with a narrow waist and long, toned legs.\n\nHer skin is healthy and fair with a soft rosy glow, and her makeup follows a natural Korean beauty style. The setting is an indoor room with walls covered in old posters and vintage newspapers, evoking a nostalgic vibe.\n\nThe lighting is soft, studio-style, emphasizing realistic textures and natural tones. Render: Ultra-realistic 8K, cinematic detail, balanced composition, and soft focus on the model's face and outfit.",
        actionPrompt: ''
    },
    {
        id: 'pha-cach-anh-nhin-nghieng',
        name: 'Ánh nhìn nghiêng sau kính đen',
        industry: 'Phá Cách',
        ageGroup: 'Nam',
        characterPrompt: "Close-up portrait of a young man (keep his face and hairstyle exactly as in the attached reference). He is wearing a white-striped beanie and large black sunglasses. His head is slightly tilted as he gazes softly to the side, lips slightly parted.\n\nHe has smooth, fair skin and subtle wavy hair peeking out from beneath the beanie. He wears a plain gray t-shirt and a silver necklace with a Jesus cross pendant.\n\nStyle: cinematic close-up, clean skin texture, soft natural lighting, shallow depth of field, sharp focus on facial features, realistic details, high resolution.",
        actionPrompt: ''
    },
];

interface ImageCreatorProps {
    onGenerationComplete: (data: { urls: string[], prompt: string, sourceTab: Tab }) => void;
}

const ImageCreator: React.FC<ImageCreatorProps> = ({ onGenerationComplete }) => {
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [removeBackground, setRemoveBackground] = useState<boolean>(false);
    const [influence, setInfluence] = useState<number>(100);
    const [influenceEnabled, setInfluenceEnabled] = useState<boolean>(true);
    const [characterPrompt, setCharacterPrompt] = useState<string>('');
    const [actionPrompt, setActionPrompt] = useState<string>('');
    const [quality, setQuality] = useState<Quality>('high');
    
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [presets, setPresets] = useState<Preset[]>(initialPresets);
    const [isSavingPreset, setIsSavingPreset] = useState<boolean>(false);
    const [newPresetData, setNewPresetData] = useState({ name: '', industry: 'Thời trang', ageGroup: 'Người lớn' });
    
    const [selectedIndustry, setSelectedIndustry] = useState<string>('');
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');
    
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [personalityResult, setPersonalityResult] = useState<string | null>(null);
    const [styleSuggestions, setStyleSuggestions] = useState<string[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file.');
                return;
            }
            setError(null);
            setGeneratedImages([]);
            setPersonalityResult(null);
            setStyleSuggestions([]);
            setSelectedStyle(null);
            setActionPrompt('');
            setCharacterPrompt('');
            
            const reader = new FileReader();
            reader.onloadend = async () => {
                const imageDataUrl = reader.result as string;
                setReferenceImage(imageDataUrl);
                
                try {
                    setIsAnalyzing(true);
                    const parts = imageDataUrl.split(';base64,');
                    const mimeType = parts[0].split(':')[1];
                    const imageBase64 = parts[1];
                    
                    const analysis = await analyzeImageAndSuggestStyles(imageBase64, mimeType);
                    
                    setCharacterPrompt(analysis.description);
                    setPersonalityResult(analysis.personality);
                    setStyleSuggestions(analysis.styles);
                } catch (err: any) {
                    setError(err.message || 'An error occurred during image analysis.');
                } finally {
                    setIsAnalyzing(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleReset = useCallback(() => {
        setReferenceImage(null);
        setRemoveBackground(false);
        setInfluence(100);
        setInfluenceEnabled(true);
        setCharacterPrompt('');
        setActionPrompt('');
        setQuality('high');
        setGeneratedImages([]);
        setSelectedPresetId('');
        setSelectedIndustry('');
        setPersonalityResult(null);
        setStyleSuggestions([]);
        setSelectedStyle(null);
        setIsAnalyzing(false);
        setError(null);
    }, []);

    const handleSubmit = useCallback(async () => {
        const fullPrompt = `${characterPrompt} ${actionPrompt}`.trim();
        if (!fullPrompt && !referenceImage) {
            setError('Please describe an image or upload a reference.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const imageInputs: ImageInput[] = [];

            if (referenceImage) {
                const parts = referenceImage.split(';base64,');
                const mimeType = parts[0].split(':')[1];
                const base64 = parts[1];
                imageInputs.push({ base64, mimeType });
            }
            
            let finalPrompt = "";
            if (referenceImage) {
                finalPrompt += "QUAN TRỌNG HÀNG ĐẦU: Giữ nguyên 100% khuôn mặt và các đặc điểm trên mặt của người trong ảnh tham khảo. Không thay đổi bất cứ điều gì trên khuôn mặt. (Top priority: Preserve the face and all facial features of the person in the reference image with 100% accuracy. Do not alter the face in any way.) ";
            }

            finalPrompt += fullPrompt;

            if (referenceImage) {
                 if(removeBackground) finalPrompt += " với nền được xóa khỏi ảnh tham chiếu";
                 if(influenceEnabled) finalPrompt += ` với ${influence}% ảnh hưởng từ các yếu tố khác của ảnh tham chiếu (quần áo, tư thế, bối cảnh)`;
            }
            
            if (quality === 'ultra') {
                finalPrompt += " Image quality ultra, 8K, hyperrealistic.";
            } else if (quality === 'high') {
                finalPrompt += " Image quality high, 4K, detailed.";
            } else {
                 finalPrompt += " Image quality standard.";
            }

            const resultUrls = await generateFourImages(finalPrompt, imageInputs);
            setGeneratedImages(resultUrls);
            onGenerationComplete({ urls: resultUrls, prompt: finalPrompt, sourceTab: 'creator' });
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [characterPrompt, actionPrompt, referenceImage, removeBackground, influence, influenceEnabled, quality, onGenerationComplete]);
    
    const handleDownloadAll = () => {
        if (generatedImages.length === 0) return;
    
        const zip = new JSZip();
        generatedImages.forEach((src, index) => {
            const base64Data = src.substring(src.indexOf(',') + 1);
            zip.file(`generated-image-${index + 1}.png`, base64Data, { base64: true });
        });
    
        zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
            const link = document.createElement('a');
            const url = URL.createObjectURL(content);
            link.href = url;
            link.download = 'generated-images.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    };

    const canSubmit = useMemo(() => {
        return (characterPrompt || actionPrompt || referenceImage) && !isLoading;
    }, [characterPrompt, actionPrompt, referenceImage, isLoading]);

    const handleApplyPreset = (preset: Preset) => {
        setCharacterPrompt(preset.characterPrompt);
        setActionPrompt(preset.actionPrompt);
    };
    
    const handlePresetSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const presetId = e.target.value;
        setSelectedPresetId(presetId);
        if (presetId) {
            const selectedPreset = presets.find(p => p.id === presetId);
            if (selectedPreset) {
                handleApplyPreset(selectedPreset);
            }
        } else {
            setCharacterPrompt('');
            setActionPrompt('');
        }
    };
    
    const handleIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedIndustry(e.target.value);
        setSelectedPresetId(''); // Reset preset when industry changes
        if (!e.target.value) { // If going back to "--chọn--"
            setCharacterPrompt('');
            setActionPrompt('');
        }
    };
    
    const handleStyleClick = (style: string) => {
        setSelectedStyle(style);
        setActionPrompt(`trong trang phục theo phong cách ${style.toLowerCase()}`);
    };

    const handleSavePreset = () => {
        if (!newPresetData.name.trim()) {
            setError("Vui lòng nhập tên cho chủ đề.");
            return;
        }
        if (!characterPrompt.trim() && !actionPrompt.trim()) {
            setError("Không thể lưu chủ đề trống. Vui lòng điền mô tả nhân vật hoặc hành động.");
            return;
        }
        
        const newPreset: Preset = {
            id: new Date().toISOString(),
            name: newPresetData.name,
            industry: newPresetData.industry,
            ageGroup: newPresetData.ageGroup,
            characterPrompt: characterPrompt,
            actionPrompt: actionPrompt
        };

        setPresets(prev => [newPreset, ...prev]);
        setIsSavingPreset(false);
        setNewPresetData({ name: '', industry: 'Thời trang', ageGroup: 'Người lớn' });
        setError(null);
    };
    
    const handleNewPresetDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewPresetData(prev => ({...prev, [name]: value}));
    };

    const uniquePresetNames = useMemo(() => {
        return [...new Set(presets.map(p => p.name))];
    }, [presets]);

    const uniqueIndustries = useMemo(() => {
        return [...new Set(presets.map(p => p.industry))];
    }, [presets]);

    const uniqueAgeGroups = useMemo(() => {
        return [...new Set(presets.map(p => p.ageGroup))];
    }, [presets]);

    const filteredPresets = useMemo(() => {
        if (!selectedIndustry) return [];
        return presets.filter(p => p.industry === selectedIndustry);
    }, [presets, selectedIndustry]);

    const stepOffset = (personalityResult && styleSuggestions.length > 0) ? 2 : 0;

    return (
        <div className="w-full flex-grow flex flex-col lg:flex-row gap-2 md:gap-4 p-2 md:p-4">
            {/* Controls Panel */}
            <div className="lg:w-[420px] flex-shrink-0 flex flex-col gap-4">
                <div className="bg-neutral-900 rounded-lg p-4 flex-grow flex flex-col gap-4">
                    <ControlSection title="1. Tải lên ảnh tham khảo">
                        <label htmlFor="file-upload" className="w-full cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 transition-colors rounded-lg flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                            <UploadIcon className="w-8 h-8 mb-2" />
                            <span className="font-semibold">Nhấn để tải ảnh lên</span>
                            <span className="text-sm">Bạn có thể chọn nhiều ảnh</span>
                            {referenceImage && <img src={referenceImage} alt="Reference" className="mt-4 max-h-24 rounded-md"/>}
                        </label>
                        <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-sm">Xóa nền</p>
                                <p className="text-xs text-neutral-500">Xóa nền khỏi ảnh tham khảo</p>
                            </div>
                            <button onClick={() => setRemoveBackground(!removeBackground)} role="switch" aria-checked={removeBackground} className={`${removeBackground ? 'bg-amber-500' : 'bg-neutral-700'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                                <span className={`${removeBackground ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm">Mức độ ảnh hưởng</p>
                                <button onClick={() => setInfluenceEnabled(!influenceEnabled)} className={`text-xs font-bold px-2 py-0.5 rounded ${influenceEnabled ? 'bg-amber-500 text-black' : 'bg-neutral-700 text-neutral-300'}`}>BẬT</button>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="range" min="0" max="100" value={influence} onChange={(e) => setInfluence(Number(e.target.value))} disabled={!influenceEnabled} className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                                <span className="text-sm font-mono w-12 text-right">{influence}%</span>
                            </div>
                        </div>
                    </ControlSection>

                    {isAnalyzing && (
                        <div className="flex flex-col items-center justify-center p-4 bg-neutral-800/50 rounded-lg text-center">
                            <Spinner />
                            <p className="mt-3 text-sm text-neutral-300">Đang phân tích ảnh của bạn...</p>
                        </div>
                    )}

                    {personalityResult && !isAnalyzing && (
                        <ControlSection title="💡 Bước 2: Phân tích cá tính">
                            <div className="bg-amber-900/20 p-4 rounded-lg">
                                <p className="font-semibold text-lg">
                                    Kết quả: <span className="text-amber-400 font-bold">{personalityResult}</span>
                                </p>
                            </div>
                        </ControlSection>
                    )}
                    
                    {styleSuggestions.length > 0 && !isAnalyzing && (
                        <ControlSection title="🎨 Bước 3: Gợi ý 7 phong cách thời trang">
                            <div className="flex flex-wrap gap-2">
                                {styleSuggestions.map(style => (
                                    <button
                                        key={style}
                                        onClick={() => handleStyleClick(style)}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${selectedStyle === style ? 'bg-amber-500 text-black' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </ControlSection>
                    )}
                    
                    <ControlSection title={`${2 + stepOffset}. Mô tả nhân vật và trang phục`}>
                        <textarea value={characterPrompt} onChange={(e) => setCharacterPrompt(e.target.value)} placeholder="AI sẽ tự động điền vào đây sau khi bạn tải ảnh lên..." className="w-full h-24 p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" />
                    </ControlSection>

                    <ControlSection title={`${3 + stepOffset}. Mô tả hành động và dáng đi`}>
                        <textarea value={actionPrompt} onChange={(e) => setActionPrompt(e.target.value)} placeholder="...theo sự sáng tạo của bạn." className="w-full h-24 p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" />
                    </ControlSection>
                    
                    <ControlSection title={`${4 + stepOffset}. Chủ đề và Prompts đã lưu`}>
                        <button onClick={() => setIsSavingPreset(!isSavingPreset)} disabled={!characterPrompt && !actionPrompt} className="w-full text-sm font-semibold py-2 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSavingPreset ? 'Hủy' : 'Lưu chủ đề và prompt hiện tại'}
                        </button>
                        {isSavingPreset && (
                            <div className="mt-3 space-y-3 p-3 bg-neutral-800/50 rounded-md border border-neutral-700">
                                <div>
                                    <input list="preset-names-list" name="name" placeholder="Tên chủ đề, ví dụ: Thời trang hè" value={newPresetData.name} onChange={handleNewPresetDataChange} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors text-sm"/>
                                    <datalist id="preset-names-list">
                                        {uniquePresetNames.map(name => (
                                            <option key={name} value={name} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <input list="industries-list" name="industry" value={newPresetData.industry} onChange={handleNewPresetDataChange} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors text-sm"/>
                                        <datalist id="industries-list">
                                            {uniqueIndustries.map(industry => (
                                                <option key={industry} value={industry} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div>
                                        <input list="age-groups-list" name="ageGroup" value={newPresetData.ageGroup} onChange={handleNewPresetDataChange} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors text-sm"/>
                                        <datalist id="age-groups-list">
                                            {uniqueAgeGroups.map(ageGroup => (
                                                <option key={ageGroup} value={ageGroup} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                                <button onClick={handleSavePreset} className="w-full py-2 px-3 text-sm font-bold rounded-md transition-colors bg-amber-500 hover:bg-amber-600 text-black">Lưu chủ đề</button>
                            </div>
                        )}
                         <div className="mt-3 space-y-3">
                            <div>
                                <label htmlFor="industry-select" className="block text-sm font-medium text-neutral-400 mb-1">Chủ đề</label>
                                <select
                                    id="industry-select"
                                    value={selectedIndustry}
                                    onChange={handleIndustryChange}
                                    className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors text-sm"
                                >
                                    <option value="">-- Chọn chủ đề --</option>
                                    {uniqueIndustries.map(industry => (
                                        <option key={industry} value={industry}>{industry}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="preset-select" className="block text-sm font-medium text-neutral-400 mb-1">Mẫu có sẵn</label>
                                <select
                                    id="preset-select"
                                    value={selectedPresetId}
                                    onChange={handlePresetSelectChange}
                                    disabled={!selectedIndustry}
                                    className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">-- Chọn một mẫu --</option>
                                    {filteredPresets.map(preset => (
                                        <option key={preset.id} value={preset.id}>{`${preset.name} (${preset.ageGroup})`}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </ControlSection>

                    <ControlSection title={`${5 + stepOffset}. Chất lượng đầu ra`}>
                        <div className="grid grid-cols-3 gap-2">
                            <QualityButton quality="standard" selectedQuality={quality} onClick={setQuality} title="Standard" subtitle="Chất lượng tốt" />
                            <QualityButton quality="high" selectedQuality={quality} onClick={setQuality} title="2K - 4K (High)" subtitle="Chi tiết sắc nét" />
                            <QualityButton quality="ultra" selectedQuality={quality} onClick={setQuality} title="8K (Ultra)" subtitle="Siêu thực" />
                        </div>
                    </ControlSection>
                </div>

                {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-md text-sm" role="alert">{error}</div>}

                <div className="flex items-center gap-2">
                    <button onClick={handleSubmit} disabled={!canSubmit} className="w-full py-3 px-4 text-base font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed">
                        {isLoading ? <><Spinner /> Đang xử lý...</> : 'Tạo ảnh'}
                    </button>
                    <button onClick={handleReset} className="py-3 px-4 text-base font-medium rounded-lg transition-colors bg-neutral-800 hover:bg-neutral-700">Làm lại</button>
                </div>
            </div>

            {/* Image Display Panel */}
            <div className="flex-grow flex flex-col bg-neutral-900 rounded-lg p-4 relative">
                <div className="flex justify-end mb-2">
                     <button onClick={handleDownloadAll} disabled={generatedImages.length === 0} className="flex items-center gap-2 text-sm font-medium py-2 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <DownloadIcon className="w-4 h-4" />
                        Tải tất cả
                    </button>
                </div>
                <div className="flex-grow flex items-center justify-center rounded-md bg-black/30 aspect-square">
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
                            <Spinner />
                            <p className="mt-4 text-lg font-semibold">Đang tạo nên tác phẩm của bạn...</p>
                        </div>
                    )}

                    {!isLoading && generatedImages.length === 0 && (
                        <div className="text-center text-neutral-600 flex flex-col items-center p-8">
                            <PhotoIcon className="w-16 h-16 mb-4" />
                            <h3 className="text-xl font-semibold text-neutral-400">Ảnh của bạn sẽ hiện ở đây.</h3>
                        </div>
                    )}
                    
                    {!isLoading && generatedImages.length > 0 && (
                         <div className="grid grid-cols-2 gap-2 w-full h-full">
                            {generatedImages.map((src, index) => (
                                <div key={index} className="relative group aspect-square">
                                    <img src={src} alt={`Generated image ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                    <a href={src} download={`generated-image-${index + 1}.png`} title="Download" className="absolute bottom-2 right-2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DownloadIcon className="w-5 h-5" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ControlSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-3">
        <h2 className="text-base font-bold text-neutral-300">{title}</h2>
        {children}
    </div>
);

const QualityButton: React.FC<{ quality: Quality, selectedQuality: Quality, onClick: (q: Quality) => void, title: string, subtitle: string }> = ({ quality, selectedQuality, onClick, title, subtitle }) => (
    <button
        onClick={() => onClick(quality)}
        className={`p-3 rounded-md text-left transition-all duration-200 border-2 ${selectedQuality === quality ? 'bg-amber-900/50 border-amber-500' : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'}`}
    >
        <p className="font-bold text-sm text-neutral-100">{title}</p>
        <p className="text-xs text-neutral-400">{subtitle}</p>
    </button>
);


export default ImageCreator;