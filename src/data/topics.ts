import type { IconName } from '../components/Icons';

/** Bài học tóm tắt tự biên soạn, sắp theo 10 chương Toán 9 Kết nối tri thức. */
export interface Topic {
  id: string;
  chapter: string;
  title: string;
  category: 'Đại số' | 'Hình học' | 'Thống kê';
  description: string;
  icon: IconName;
  color: 'blue' | 'red' | 'yellow';
  goals: string[];
  example: string;
  quizzes: { question: string; options: string[]; answer: number; explanation: string }[];
}
export const topics: Topic[] = [
  {
    id: 'he-phuong-trinh',
    title: 'Phương trình & hệ bậc nhất hai ẩn',
    category: 'Đại số',
    icon: 'equation',
    color: 'red',
    description: 'Phương trình hai ẩn, giải hệ và bài toán thực tế.',
    goals: [
      'Một nghiệm của phương trình hai ẩn $ax+by=c$ là cặp số $(x;y)$ làm cho đẳng thức đúng.',
      'Phương pháp thế: biểu diễn một ẩn theo ẩn còn lại, thế vào phương trình thứ hai rồi giải.',
      'Phương pháp cộng đại số: nhân hai vế với các hệ số thích hợp để khử một ẩn. Luôn thử lại nghiệm.',
    ],
    example:
      'Giải hệ $2x+y=7$ và $x-y=2$. Cộng hai phương trình được $3x=9$, suy ra $x=3$. Thế vào $x-y=2$ được $y=1$. Nghiệm là $(3;1)$.',
    quizzes: [
      {
        question: 'Hệ $x+y=5$, $x-y=1$ có nghiệm nào?',
        options: ['$(3;2)$', '$(2;3)$', '$(4;1)$', '$(1;4)$'],
        answer: 0,
        explanation: 'Cộng hai phương trình: $2x=6$ nên $x=3$. Từ $x+y=5$ suy ra $y=2$.',
      },
      {
        question: 'Cặp số nào là nghiệm của phương trình $2x+3y=7$?',
        options: ['$(1;1)$', '$(2;1)$', '$(3;1)$', '$(1;2)$'],
        answer: 1,
        explanation: 'Thay $(x;y)=(2;1)$ được $2\\cdot2+3\\cdot1=7$.',
      },
    ],
    chapter: 'I',
  },
  {
    id: 'bat-phuong-trinh',
    title: 'Phương trình & bất phương trình bậc nhất',
    category: 'Đại số',
    icon: 'equation',
    color: 'yellow',
    description: 'Phương trình quy về bậc nhất, bất đẳng thức và tập nghiệm.',
    goals: [
      'Với phương trình chứa ẩn ở mẫu, tìm điều kiện xác định trước khi quy đồng; nghiệm tìm được phải thỏa mãn điều kiện này.',
      'Cộng hoặc trừ cùng một số vào hai vế không làm đổi chiều bất đẳng thức. Nhân hoặc chia hai vế với số âm phải đổi chiều.',
      'Phân biệt phương trình và bất phương trình; thử lại nghiệm và biểu diễn tập nghiệm trên trục số.',
    ],
    example:
      'Giải $\\dfrac{2}{x-1}=1$ với $x\\ne1$. Nhân hai vế với $x-1$ được $2=x-1$, suy ra $x=3$ (thỏa mãn điều kiện). Với $-2x+4>0$, chia cho $-2$ và đổi chiều để được $x<2$.',
    quizzes: [
      {
        question: 'Bất phương trình $-3x\\geq6$ có tập nghiệm là:',
        options: ['$x\\geq-2$', '$x<-2$', '$x\\leq-2$', '$x\\leq2$'],
        answer: 2,
        explanation: 'Chia hai vế cho $-3$, phải đổi chiều: $x\\leq-2$.',
      },
      {
        question: 'Nghiệm của $2x-1<5$ là:',
        options: ['$x<3$', '$x>3$', '$x<2$', '$x>2$'],
        answer: 0,
        explanation: '$2x-1<5\\Leftrightarrow2x<6\\Leftrightarrow x<3$.',
      },
    ],
    chapter: 'II',
  },
  {
    id: 'can-bac-hai',
    title: 'Căn bậc hai & căn bậc ba',
    category: 'Đại số',
    icon: 'radical',
    color: 'blue',
    description: 'Căn thức, điều kiện xác định và biến đổi biểu thức.',
    goals: [
      'Căn bậc hai số học $\\sqrt{a}$ được xác định với $a\\geq 0$ và luôn không âm.',
      'Với mọi số thực $a$: $\\sqrt{a^2}=|a|$. Nhớ xét dấu trước khi bỏ dấu giá trị tuyệt đối.',
      'Với $a,b\\geq 0$: $\\sqrt{ab}=\\sqrt a\\sqrt b$. Tách thừa số chính phương để rút gọn.',
      'Căn bậc ba $\\sqrt[3]{a}$ xác định với mọi số thực $a$; chẳng hạn $\\sqrt[3]{-8}=-2$.',
    ],
    example:
      'Rút gọn $\\sqrt{50}-\\sqrt{8}$. Ta có $\\sqrt{50}=5\\sqrt{2}$ và $\\sqrt{8}=2\\sqrt{2}$. Vậy $\\sqrt{50}-\\sqrt{8}=3\\sqrt{2}$.',
    quizzes: [
      {
        question: 'Căn bậc hai số học của $49$ bằng bao nhiêu?',
        options: ['$-7$', '$7$', '$\\pm7$', '$49$'],
        answer: 1,
        explanation: '$\\sqrt{49}=7$ vì $7\\geq 0$ và $7^2=49$.',
      },
      {
        question: 'Giá trị của $\\sqrt{(-3)^2}$ là:',
        options: ['$3$', '$-3$', '$9$', 'Không xác định'],
        answer: 0,
        explanation: '$\\sqrt{(-3)^2}=|-3|=3$.',
      },
    ],
    chapter: 'III',
  },
  {
    id: 'he-thuc-luong',
    title: 'Hệ thức lượng trong tam giác vuông',
    category: 'Hình học',
    icon: 'geometry',
    color: 'yellow',
    description: 'Tỉ số lượng giác và những bài toán đo đạc.',
    goals: [
      'Với góc nhọn $\\alpha$, gọi cạnh đối là $a$, cạnh kề là $b$, cạnh huyền là $c$. Khi đó $\\sin\\alpha=\\dfrac ac$ và $\\cos\\alpha=\\dfrac bc$.',
      '$\\tan\\alpha=\\dfrac ab$ và $\\cot\\alpha=\\dfrac ba$. Hai góc nhọn phụ nhau có $\\sin\\alpha=\\cos(90^\\circ-\\alpha)$.',
      'Vẽ hình, xác định cạnh và góc đã biết, chọn hệ thức phù hợp rồi ghi rõ đơn vị.',
    ],
    example:
      'Một tam giác vuông có cạnh huyền dài $10$ cm và một góc nhọn bằng $30^\\circ$. Cạnh đối diện góc này dài $10\\sin30^\\circ=10\\cdot\\dfrac12=5$ cm.',
    quizzes: [
      {
        question: 'Giá trị của $\\sin30^\\circ$ là:',
        options: ['$\\dfrac12$', '$\\dfrac{\\sqrt3}{2}$', '$1$', '$0$'],
        answer: 0,
        explanation:
          'Góc $30^\\circ$ trong tam giác vuông có cạnh đối bằng nửa cạnh huyền, nên $\\sin30^\\circ=\\dfrac12$.',
      },
      {
        question: 'Giá trị của $\\tan45^\\circ$ là:',
        options: ['$0$', '$2$', '$1$', '$\\sqrt2$'],
        answer: 2,
        explanation:
          'Trong tam giác vuông cân, hai cạnh góc vuông bằng nhau nên $\\tan45^\\circ=1$.',
      },
    ],
    chapter: 'IV',
  },
  {
    id: 'duong-tron',
    title: 'Đường tròn',
    category: 'Hình học',
    icon: 'circle',
    color: 'red',
    description: 'Cung tròn, hình quạt và vị trí tương đối.',
    goals: [
      'Đường tròn bán kính $R$ có chu vi $C=2\\pi R$; hình tròn có diện tích $S=\\pi R^2$.',
      'Cung có số đo $n^\\circ$ có độ dài $l=\\dfrac{\\pi Rn}{180}$; hình quạt tương ứng có diện tích $S=\\dfrac{\\pi R^2n}{360}$.',
      'Với khoảng cách $d$ từ tâm đến đường thẳng: $d<R$ thì cắt tại hai điểm, $d=R$ thì tiếp xúc, $d>R$ thì không giao nhau. Hai đường tròn có thể cắt nhau, tiếp xúc hoặc không giao nhau.',
    ],
    example:
      'Đường tròn bán kính $6$ cm có cung $60^\\circ$. Độ dài cung là $\\dfrac{\\pi\\cdot6\\cdot60}{180}=2\\pi$ cm. Hình quạt tương ứng có diện tích $\\dfrac{\\pi\\cdot6^2\\cdot60}{360}=6\\pi\\text{ cm}^2$.',
    quizzes: [
      {
        question: 'Đường tròn bán kính $2$ cm có chu vi:',
        options: ['$2\\pi$ cm', '$8\\pi$ cm', '$4\\pi$ cm', '$4$ cm'],
        answer: 2,
        explanation: '$C=2\\pi R=2\\pi\\cdot2=4\\pi$ cm.',
      },
      {
        question: 'Khoảng cách từ tâm đến đường thẳng bằng bán kính. Đường thẳng đó:',
        options: [
          'Cắt đường tròn tại hai điểm',
          'Tiếp xúc với đường tròn',
          'Không giao với đường tròn',
          'Đi qua tâm đường tròn',
        ],
        answer: 1,
        explanation:
          'Khi $d=R$, đường thẳng và đường tròn có đúng một điểm chung, nên đường thẳng là tiếp tuyến.',
      },
    ],
    chapter: 'V',
  },
  {
    id: 'ham-so-bac-hai',
    title: 'Hàm số y = ax² & phương trình bậc hai',
    category: 'Đại số',
    icon: 'function',
    color: 'blue',
    description: 'Khám phá parabol, biệt thức và hệ thức Viète.',
    goals: [
      'Đồ thị $y=ax^2$ với $a\\ne0$ là một parabol có đỉnh tại gốc tọa độ và trục đối xứng là $Oy$.',
      'Phương trình $ax^2+bx+c=0$ ($a\\ne0$) có biệt thức $\\Delta=b^2-4ac$. Khi $\\Delta\\geq0$, nghiệm là $x=\\dfrac{-b\\pm\\sqrt\\Delta}{2a}$.',
      'Nếu có hai nghiệm $x_1,x_2$ (kể cả nghiệm kép), thì $x_1+x_2=-\\dfrac ba$ và $x_1x_2=\\dfrac ca$.',
    ],
    example:
      'Giải $x^2-5x+6=0$. Ta có $\\Delta=25-24=1$. Hai nghiệm là $x_1=(5-1)/2=2$ và $x_2=(5+1)/2=3$. Kiểm tra: $2+3=5$ và $2\\cdot3=6$.',
    quizzes: [
      {
        question: 'Biệt thức của $x^2-4x+4=0$ bằng bao nhiêu?',
        options: ['$16$', '$0$', '$8$', '$-16$'],
        answer: 1,
        explanation: '$\\Delta=(-4)^2-4\\cdot1\\cdot4=16-16=0$ nên phương trình có nghiệm kép.',
      },
      {
        question: 'Trên đồ thị $y=2x^2$, khi $x=-2$ thì $y$ bằng:',
        options: ['$8$', '$-8$', '$4$', '$-4$'],
        answer: 0,
        explanation: '$y=2\\cdot(-2)^2=2\\cdot4=8$.',
      },
    ],
    chapter: 'VI',
  },
  {
    id: 'tan-so',
    chapter: 'VII',
    title: 'Tần số & tần số tương đối',
    category: 'Thống kê',
    icon: 'chart',
    color: 'red',
    description: 'Lập bảng, đọc biểu đồ và xử lí số liệu ghép nhóm.',
    goals: [
      'Tần số của một giá trị là số lần giá trị đó xuất hiện trong mẫu. Tổng các tần số bằng cỡ mẫu $N$.',
      'Tần số tương đối của một giá trị là $f=\\dfrac nN$, trong đó $n$ là tần số. Khi viết dưới dạng phần trăm, nhân kết quả với $100\\%$.',
      'Với số liệu ghép nhóm, đếm số giá trị thuộc mỗi khoảng và chú ý quy ước đầu mút. Chọn biểu đồ phù hợp, ghi rõ tên và đơn vị.',
    ],
    example:
      'Mẫu điểm $6;7;7;8;7$ có $N=5$. Điểm $7$ xuất hiện $3$ lần nên có tần số $3$, tần số tương đối $3/5=60\\%$.',
    quizzes: [
      {
        question: 'Trong mẫu $2;3;3;5;3$, tần số của giá trị $3$ là:',
        options: ['$2$', '$3$', '$5$', '$1$'],
        answer: 1,
        explanation: 'Giá trị 3 xuất hiện đúng 3 lần nên có tần số bằng 3.',
      },
      {
        question: 'Trong 20 học sinh có 5 bạn chọn bóng rổ. Tần số tương đối của lựa chọn này là:',
        options: ['$5\\%$', '$20\\%$', '$25\\%$', '$50\\%$'],
        answer: 2,
        explanation: 'Tần số tương đối bằng $\\dfrac5{20}=0{,}25=25\\%$.',
      },
    ],
  },
  {
    id: 'xac-suat',
    chapter: 'VIII',
    title: 'Xác suất trong mô hình đơn giản',
    category: 'Thống kê',
    icon: 'chart',
    color: 'blue',
    description: 'Phép thử ngẫu nhiên, không gian mẫu và biến cố.',
    goals: [
      'Phép thử ngẫu nhiên có nhiều kết quả có thể xảy ra. Tập hợp tất cả các kết quả có thể là không gian mẫu.',
      'Với các kết quả đồng khả năng, xác suất của biến cố $A$ là $P(A)=\\dfrac mn$, trong đó $m$ là số kết quả thuận lợi và $n$ là tổng số kết quả có thể.',
      'Khi thực hiện nhiều bước, dùng bảng hoặc sơ đồ cây để liệt kê đầy đủ. Luôn kiểm tra các kết quả có đồng khả năng hay không.',
    ],
    example:
      'Gieo một con xúc xắc cân đối có $6$ mặt. Biến cố “số chấm chẵn” có $3$ kết quả thuận lợi: $2,4,6$. Xác suất là $3/6=1/2$.',
    quizzes: [
      {
        question: 'Gieo một xúc xắc cân đối 6 mặt. Xác suất xuất hiện số chấm lớn hơn 4 là:',
        options: ['$\\dfrac13$', '$\\dfrac12$', '$\\dfrac23$', '$\\dfrac16$'],
        answer: 0,
        explanation:
          'Có $2$ kết quả thuận lợi là $5,6$ trong $6$ kết quả đồng khả năng, nên xác suất là $2/6=1/3$.',
      },
      {
        question: 'Tung hai đồng xu cân đối, độc lập. Xác suất cả hai đều xuất hiện mặt ngửa là:',
        options: ['$\\dfrac12$', '$\\dfrac14$', '$\\dfrac34$', '$1$'],
        answer: 1,
        explanation:
          'Bốn kết quả đồng khả năng là (ngửa, ngửa), (ngửa, sấp), (sấp, ngửa), (sấp, sấp). Chỉ có một kết quả thuận lợi nên xác suất là $1/4$.',
      },
    ],
  },
  {
    id: 'duong-tron-ngoai-tiep-noi-tiep',
    chapter: 'IX',
    title: 'Đường tròn ngoại tiếp & nội tiếp',
    category: 'Hình học',
    icon: 'circle',
    color: 'red',
    description: 'Góc nội tiếp, tam giác, tứ giác nội tiếp và đa giác đều.',
    goals: [
      'Góc nội tiếp bằng nửa số đo cung bị chắn. Các góc nội tiếp cùng chắn một cung thì bằng nhau; góc nội tiếp chắn nửa đường tròn là góc vuông.',
      'Tâm đường tròn ngoại tiếp tam giác là giao điểm ba đường trung trực; tâm đường tròn nội tiếp là giao điểm ba đường phân giác trong.',
      'Tứ giác nội tiếp có tổng hai góc đối bằng $180^\\circ$. Đa giác đều có các cạnh bằng nhau và các góc bằng nhau; tâm của nó cũng là tâm đường tròn ngoại tiếp và nội tiếp.',
    ],
    example:
      'Tam giác $ABC$ vuông tại $A$, có $BC=10$ cm. Trung điểm $O$ của cạnh huyền cách đều ba đỉnh, nên đường tròn ngoại tiếp có tâm $O$ và bán kính $R=BC/2=5$ cm.',
    quizzes: [
      {
        question: 'Góc ở tâm bằng $80^\\circ$. Góc nội tiếp cùng chắn cung đó bằng:',
        options: ['$80^\\circ$', '$40^\\circ$', '$160^\\circ$', '$20^\\circ$'],
        answer: 1,
        explanation: 'Góc nội tiếp bằng nửa góc ở tâm cùng chắn cung: $80^\\circ/2=40^\\circ$.',
      },
      {
        question: 'Tứ giác $ABCD$ nội tiếp có $\\widehat A=110^\\circ$. Góc $C$ bằng:',
        options: ['$110^\\circ$', '$90^\\circ$', '$70^\\circ$', '$55^\\circ$'],
        answer: 2,
        explanation:
          'Hai góc đối của tứ giác nội tiếp bù nhau: $\\widehat C=180^\\circ-110^\\circ=70^\\circ$.',
      },
    ],
  },
  {
    id: 'hinh-khong-gian',
    title: 'Một số hình khối trong thực tiễn',
    category: 'Hình học',
    icon: 'cone',
    color: 'yellow',
    description: 'Hình trụ, hình nón, hình cầu và bài toán đo lường.',
    goals: [
      'Hình trụ có thể tích $V=\\pi r^2h$. Hình nón cùng bán kính đáy và chiều cao có thể tích bằng một phần ba: $V=\\dfrac13\\pi r^2h$.',
      'Mặt cầu có diện tích $S=4\\pi R^2$; hình cầu có thể tích $V=\\dfrac43\\pi R^3$.',
      'Đổi các kích thước về cùng đơn vị; phân biệt bán kính với đường kính, chiều cao với đường sinh.',
    ],
    example:
      'Hình trụ có bán kính đáy $3$ cm, chiều cao $4$ cm. Thể tích là $V=\\pi\\cdot3^2\\cdot4=36\\pi\\text{ cm}^3$. Hình nón cùng đáy và chiều cao có thể tích $12\\pi\\text{ cm}^3$.',
    quizzes: [
      {
        question: 'Hình nón có $r=3$ cm, $h=4$ cm. Thể tích là:',
        options: [
          '$36\\pi\\text{ cm}^3$',
          '$12\\pi\\text{ cm}^3$',
          '$9\\pi\\text{ cm}^3$',
          '$4\\pi\\text{ cm}^3$',
        ],
        answer: 1,
        explanation: '$V=\\dfrac13\\pi r^2h=\\dfrac13\\pi\\cdot9\\cdot4=12\\pi\\text{ cm}^3$.',
      },
      {
        question: 'Hình trụ có $r=2$ cm, $h=5$ cm. Thể tích là:',
        options: [
          '$10\\pi\\text{ cm}^3$',
          '$25\\pi\\text{ cm}^3$',
          '$20\\pi\\text{ cm}^3$',
          '$4\\pi\\text{ cm}^3$',
        ],
        answer: 2,
        explanation: '$V=\\pi r^2h=\\pi\\cdot2^2\\cdot5=20\\pi\\text{ cm}^3$.',
      },
    ],
    chapter: 'X',
  },
];
