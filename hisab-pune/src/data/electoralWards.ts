import type { ElectoralWard } from './types';

/**
 * PMC electoral wards & corporators — Jan 2026 civic election.
 * Source: Wikipedia "2026 Pune Municipal Corporation election"
 * (ward-wise winners table; cross-checked with Pune Mirror / OpenCity gazette).
 */
export const electoralWards: ElectoralWard[] = [
  {
    id: 1,
    name: "Kalas–Dhanori–Lohegaon",
    corporators: [
      { seat: 'A', name: "Ashwini Rahul (Appa) Bhandare", party: "BJP" },
      { seat: 'B', name: "Sangita Sandeep Dangat", party: "BJP" },
      { seat: 'C', name: "Rekha Chandrakant Tingre", party: "NCP" },
      { seat: 'D', name: "Anil (Bobby) Vasantrao Tingre", party: "BJP" },
    ],
  },
  {
    id: 2,
    name: "Phulenagar–Nagpur Chawl",
    corporators: [
      { seat: 'A', name: "Nandini Siddharth Dhende", party: "NCP" },
      { seat: 'B', name: "Ravi (Harshal) Ramesh Tingre", party: "NCP" },
      { seat: 'C', name: "Shital Ajay Sawant", party: "NCP" },
      { seat: 'D', name: "Suhas Vijay Tingre", party: "NCP" },
    ],
  },
  {
    id: 3,
    name: "Viman Nagar–Lohegaon",
    corporators: [
      { seat: 'A', name: "Dr. Shreyas Pritam Khandve", party: "BJP" },
      { seat: 'B', name: "Anil Dilip Satav", party: "BJP" },
      { seat: 'C', name: "Aishwarya Surendra Pathare", party: "BJP" },
      { seat: 'D', name: "Ramdas Dattatray Dabhade", party: "BJP" },
    ],
  },
  {
    id: 4,
    name: "Kharadi–Wagholi",
    corporators: [
      { seat: 'A', name: "Shailjeet Jaywant Bansode", party: "BJP" },
      { seat: 'B', name: "Ratnamala Sandeep Satav", party: "BJP" },
      { seat: 'C', name: "Trupti Santosh Bharane", party: "BJP" },
      { seat: 'D', name: "Surendra Bapusaheb Pathare", party: "BJP" },
    ],
  },
  {
    id: 5,
    name: "Kalyani Nagar–Vadgaon Sheri",
    corporators: [
      { seat: 'A', name: "Narayan Mohan Galande", party: "BJP" },
      { seat: 'B', name: "Shweta Mukund Galande", party: "BJP" },
      { seat: 'C', name: "Kavita Mahendra Galande", party: "BJP" },
      { seat: 'D', name: "Yogesh Tukaram Mulik", party: "BJP" },
    ],
  },
  {
    id: 6,
    name: "Yerawada–Gandhinagar",
    corporators: [
      { seat: 'A', name: "Adv. Avinash Raj Salve", party: "INC" },
      { seat: 'B', name: "Saira Hanif Sheikh", party: "INC" },
      { seat: 'C', name: "Ashwini Daniel Landge", party: "INC" },
      { seat: 'D', name: "Vishal Hari Malke", party: "INC" },
    ],
  },
  {
    id: 7,
    name: "Gokhale Nagar–Wakdewadi",
    corporators: [
      { seat: 'A', name: "Nisha Sachin Manvatkar", party: "BJP" },
      { seat: 'B', name: "Anjali Vinodanna Orse", party: "NCP" },
      { seat: 'C', name: "Adv. Nilesh Narayan Nikam", party: "NCP" },
      { seat: 'D', name: "Datta Bahirat", party: "NCP" },
    ],
  },
  {
    id: 8,
    name: "Aundh–Bopodi",
    corporators: [
      { seat: 'A', name: "Parshuram Balkrishna Wadekar", party: "RPI(A)" },
      { seat: 'B', name: "Bhakti Ajit Gaikwad", party: "BJP" },
      { seat: 'C', name: "Sapna Anand Chhajed", party: "BJP" },
      { seat: 'D', name: "Chandrashekhar (Sunny) Vinayak Nimhan", party: "BJP" },
    ],
  },
  {
    id: 9,
    name: "Sus–Baner–Pashan",
    corporators: [
      { seat: 'A', name: "Rohini Sudhir Chimte", party: "BJP" },
      { seat: 'B', name: "Baburao Dattoba Chandere", party: "NCP" },
      { seat: 'C', name: "Mayuri Rahul Kokate", party: "BJP" },
      { seat: 'D', name: "Amol Ratan Balwadkar", party: "NCP" },
    ],
  },
  {
    id: 10,
    name: "Bavdhan–Bhusari Colony",
    corporators: [
      { seat: 'A', name: "Kiran Dagde Patil", party: "BJP" },
      { seat: 'B', name: "Rupali Sachin Pawar", party: "BJP" },
      { seat: 'C', name: "Alpana Ganesh Varape", party: "BJP" },
      { seat: 'D', name: "Dilip Tukaram Vedepatil", party: "BJP" },
    ],
  },
  {
    id: 11,
    name: "Rambaug Colony–Shivteerth Nagar",
    corporators: [
      { seat: 'A', name: "Harshwardhan Deepak Mankar", party: "NCP" },
      { seat: 'B', name: "Deepali Santosh Dokh", party: "INC" },
      { seat: 'C', name: "Manisha Sandeep Butala", party: "BJP" },
      { seat: 'D', name: "Adv. Ramchandra (Chandusheth) Atmaram Kadam", party: "INC" },
    ],
  },
  {
    id: 12,
    name: "Shivajinagar–Model Colony",
    corporators: [
      { seat: 'A', name: "Amruta Ram Mhetre (Zadpe)", party: "BJP" },
      { seat: 'B', name: "Apoorva Dattatray Khade", party: "BJP" },
      { seat: 'C', name: "Pooja Pratul Jagade", party: "BJP" },
      { seat: 'D', name: "Nivedita Gajanan Ekabote", party: "BJP" },
    ],
  },
  {
    id: 13,
    name: "Pune Station–Jay Jawan Nagar",
    corporators: [
      { seat: 'A', name: "Nilesh Suresh Alhat", party: "BJP" },
      { seat: 'B', name: "Sumayya Maheboob Nadaf", party: "INC" },
      { seat: 'C', name: "Vaishali Nagnath Bhalerao", party: "INC" },
      { seat: 'D', name: "Arvind Shinde", party: "INC" },
    ],
  },
  {
    id: 14,
    name: "Koregaon Park–Ghorpadi–Mundhwa",
    corporators: [
      { seat: 'A', name: "Himali Navnath Kamble", party: "BJP" },
      { seat: 'B', name: "Kishor Vishnu Dhayarkar", party: "BJP" },
      { seat: 'C', name: "Surekha Chandrakant Kawade", party: "NCP" },
      { seat: 'D', name: "Umesh Dnyaneshwar Gaikwad", party: "BJP" },
    ],
  },
  {
    id: 15,
    name: "Manjari Budruk–Keshavnagar",
    corporators: [
      { seat: 'A', name: "Nanda Anil Abnave", party: "BJP" },
      { seat: 'B', name: "Dr. Dada Kodre", party: "BJP" },
      { seat: 'C', name: "Sarika Amit Ghule", party: "BJP" },
      { seat: 'D', name: "Ajit Dattatraya Ghule", party: "NCP" },
    ],
  },
  {
    id: 16,
    name: "Hadapsar–Satavwadi",
    corporators: [
      { seat: 'A', name: "Vaishali Sunil Bankar", party: "NCP" },
      { seat: 'B', name: "Ujwala Subhash Jangle", party: "BJP" },
      { seat: 'C', name: "Nitin Nivrutti Gawade", party: "SS(UBT)" },
      { seat: 'D', name: "Maruti Shivaji Tupe", party: "BJP" },
    ],
  },
  {
    id: 17,
    name: "Ramtekdi–Malwadi–Vaiduwadi",
    corporators: [
      { seat: 'A', name: "Khandu Satish Londhe", party: "BJP" },
      { seat: 'B', name: "Hemlata Nilesh Magar", party: "NCP" },
      { seat: 'C', name: "Payal Viraj Tupe", party: "BJP" },
      { seat: 'D', name: "Prashant (Mama) Tupe", party: "BJP" },
    ],
  },
  {
    id: 18,
    name: "Wanowrie–Salunkhe Vihar",
    corporators: [
      { seat: 'A', name: "Adv. Sahil Shivaji Kedari", party: "INC" },
      { seat: 'B', name: "Kalinda Muralidhar Punde", party: "BJP" },
      { seat: 'C', name: "Komal Samir Shendkar", party: "BJP" },
      { seat: 'D', name: "Prashant Sudam Jagtap", party: "INC" },
    ],
  },
  {
    id: 19,
    name: "Kondhwa Khurd–Kausarbaug",
    corporators: [
      { seat: 'A', name: "Taslim Hasan Shaikh", party: "INC" },
      { seat: 'B', name: "Aasia Maniyar", party: "INC" },
      { seat: 'C', name: "Kashif Fakrul Syed", party: "INC" },
      { seat: 'D', name: "Abdul Ghafoor Ahmed Pathan", party: "NCP(SP)" },
    ],
  },
  {
    id: 20,
    name: "Shankar Maharaj Math–Bibwewadi",
    corporators: [
      { seat: 'A', name: "Aaba (Rajendra) Y. Shilimkar", party: "BJP" },
      { seat: 'B', name: "Tanvi Prashant Divekar", party: "BJP" },
      { seat: 'C', name: "Mansi Manoj Deshpande", party: "BJP" },
      { seat: 'D', name: "Gaurav Ganesh Ghule", party: "NCP" },
    ],
  },
  {
    id: 21,
    name: "Mukundnagar–Salisbury Park",
    corporators: [
      { seat: 'A', name: "Prasannajit Bharat Vairage", party: "BJP" },
      { seat: 'B', name: "Siddhi Avinash Shilimkar", party: "BJP" },
      { seat: 'C', name: "Manisha Pravin Chorbele", party: "BJP" },
      { seat: 'D', name: "Srinath Yashwant Bhimale", party: "BJP" },
    ],
  },
  {
    id: 22,
    name: "Kashewadi–Dias Plot",
    corporators: [
      { seat: 'A', name: "Mrunal Pandurang (Bappu) Kamble", party: "BJP" },
      { seat: 'B', name: "Rafiq Abdul Rahim Sheikh", party: "INC" },
      { seat: 'C', name: "Archana Tushar Patil", party: "BJP" },
      { seat: 'D', name: "Vivek Mahadev Yadav", party: "BJP" },
    ],
  },
  {
    id: 23,
    name: "Raviwar Peth–Nana Peth",
    corporators: [
      { seat: 'A', name: "Pallavi Chandrashekhar Javale", party: "BJP" },
      { seat: 'B', name: "Sonali Vanraj Andekar", party: "NCP" },
      { seat: 'C', name: "Lakshmi Udayakant Andekar", party: "NCP" },
      { seat: 'D', name: "Vishal Gorakh Dhanwade", party: "BJP" },
    ],
  },
  {
    id: 24,
    name: "Kasba Ganpati–Kamla Nehru–KEM",
    corporators: [
      { seat: 'A', name: "Kalpana Dilip Bahirat", party: "BJP" },
      { seat: 'B', name: "Ujwala Ganesh Yadav", party: "BJP" },
      { seat: 'C', name: "Devendra (Chhotu) Wadke", party: "BJP" },
      { seat: 'D', name: "Ganesh Madhukar Bidkar", party: "BJP" },
    ],
  },
  {
    id: 25,
    name: "Shaniwar Peth–Mahatma Phule Mandai",
    corporators: [
      { seat: 'A', name: "Swapnali Nitin Pandit", party: "BJP" },
      { seat: 'B', name: "Raghavendra (Bappu) Mankar", party: "BJP" },
      { seat: 'C', name: "Swarada Gaurav Bapat", party: "BJP" },
      { seat: 'D', name: "Kunal Shailesh Tilak", party: "BJP" },
    ],
  },
  {
    id: 26,
    name: "Ghorpade Peth–Guruwar Peth–Samta Bhoomi",
    corporators: [
      { seat: 'A', name: "Ganesh Bugaji Kalyankar", party: "NCP" },
      { seat: 'B', name: "Sneha Namdev Malwade", party: "BJP" },
      { seat: 'C', name: "Aishwarya Samrat Thorat", party: "BJP" },
      { seat: 'D', name: "Ajay Appasaheb Khedekar", party: "BJP" },
    ],
  },
  {
    id: 27,
    name: "Navi Peth–Parvati",
    corporators: [
      { seat: 'A', name: "Mahesh (Amar) Vilas Awale", party: "BJP" },
      { seat: 'B', name: "Smita Vaste", party: "BJP" },
      { seat: 'C', name: "Lata Raghunath Gaud", party: "BJP" },
      { seat: 'D', name: "Dheeraj Ramachandra Ghate", party: "BJP" },
    ],
  },
  {
    id: 28,
    name: "Janata Vasahat–Hingne Khurd",
    corporators: [
      { seat: 'A', name: "Vrushali Anand Rithe", party: "BJP" },
      { seat: 'B', name: "Priya Shivaji Gadade", party: "NCP" },
      { seat: 'C', name: "Suraj Nathuram Lokhande", party: "NCP" },
      { seat: 'D', name: "Adv. Prasanna (Dada) Ghanshyam Jagtap", party: "BJP" },
    ],
  },
  {
    id: 29,
    name: "Deccan Gymkhana–Happy Colony",
    corporators: [
      { seat: 'A', name: "Sunil Namdev Pande", party: "BJP" },
      { seat: 'B', name: "Adv. Mitali Kuldeep Sawalekar", party: "BJP" },
      { seat: 'C', name: "Manjushree Sandeep Khardekar", party: "BJP" },
      { seat: 'D', name: "Puneeth Srikant Joshi", party: "BJP" },
    ],
  },
  {
    id: 30,
    name: "Karvenagar–Hingne Home Colony",
    corporators: [
      { seat: 'A', name: "Swapnil Devaram Dudhane", party: "NCP" },
      { seat: 'B', name: "Reshma Santosh Barate", party: "BJP" },
      { seat: 'C', name: "Tejashree Mahesh Pawale", party: "BJP" },
      { seat: 'D', name: "Rajesh Kisan Barate", party: "BJP" },
    ],
  },
  {
    id: 31,
    name: "Mayur Colony–Kothrud",
    corporators: [
      { seat: 'A', name: "Dinesh Mahadev Mathwad", party: "BJP" },
      { seat: 'B', name: "Jyotsna Jagannath Kulkarni", party: "BJP" },
      { seat: 'C', name: "Vasanti Navnath Jadhav", party: "BJP" },
      { seat: 'D', name: "Prithviraj Shashikant Sutar", party: "BJP" },
    ],
  },
  {
    id: 32,
    name: "Warje–Popular Nagar",
    corporators: [
      { seat: 'A', name: "Harshada Shantanu Bhosale", party: "BJP" },
      { seat: 'B', name: "Bharatbhushan Sharadchandra Barate", party: "BJP" },
      { seat: 'C', name: "Sayali Rameshbhai Wanjale", party: "BJP" },
      { seat: 'D', name: "Sachin Shivajirao Dodke", party: "BJP" },
    ],
  },
  {
    id: 33,
    name: "Shivane–Khadakwasla–Dhayari",
    corporators: [
      { seat: 'A', name: "Dhanashree Dattatray Kolhe", party: "BJP" },
      { seat: 'B', name: "Anita Tukaram Ingle", party: "NCP(SP)" },
      { seat: 'C', name: "Subhash Muralidhar Nanekar", party: "BJP" },
      { seat: 'D', name: "Sopan (Kaka) Chavan", party: "NCP(SP)" },
    ],
  },
  {
    id: 34,
    name: "Vadgaon Budruk–Dhayari",
    corporators: [
      { seat: 'A', name: "Haridas Krishna Charwad", party: "BJP" },
      { seat: 'B', name: "Komal Sarang Navale", party: "BJP" },
      { seat: 'C', name: "Jayshree Satyawan Bhumkar", party: "BJP" },
      { seat: 'D', name: "Raju Murlidhar Laygude", party: "BJP" },
    ],
  },
  {
    id: 35,
    name: "Suncity–Manikbaug",
    corporators: [
      { seat: 'A', name: "Jyoti Kishor Gosavi", party: "BJP" },
      { seat: 'B', name: "Manjusha Deepak Nagpure", party: "BJP" },
      { seat: 'C', name: "Sachin Raosaheb More", party: "BJP" },
      { seat: 'D', name: "Shrikant Shashikant Jagtap", party: "BJP" },
    ],
  },
  {
    id: 36,
    name: "Sahakarnagar–Padmavati",
    corporators: [
      { seat: 'A', name: "Veena Ganesh Ghosh", party: "BJP" },
      { seat: 'B', name: "Shailaja Arun Bhosale", party: "BJP" },
      { seat: 'C', name: "Sai Prashant Thopte", party: "BJP" },
      { seat: 'D', name: "Mahesh Nanasaheb Wable", party: "BJP" },
    ],
  },
  {
    id: 37,
    name: "Dhankawadi–Katraj Dairy",
    corporators: [
      { seat: 'A', name: "Balabhau (Kishor) Uttam Dhankawade", party: "BJP" },
      { seat: 'B', name: "Varsha Vilas Tapkir", party: "BJP" },
      { seat: 'C', name: "Tejashree Sachin Badak", party: "BJP" },
      { seat: 'D', name: "Arun Bhagwan Rajwade", party: "BJP" },
    ],
  },
  {
    id: 38,
    name: "Balajinagar–Ambegaon–Katraj",
    corporators: [
      { seat: 'A', name: "Smita Sudhir Kondhare", party: "NCP" },
      { seat: 'B', name: "Sandeep Balasaheb Beldare", party: "BJP" },
      { seat: 'C', name: "Seema Yuvraj Beldare", party: "NCP" },
      { seat: 'D', name: "Pratibha Rohidas Chorghe", party: "BJP" },
      { seat: 'E', name: "Vyankoji Maruti Khopade", party: "BJP" },
    ],
  },
  {
    id: 39,
    name: "Upper Super Indiranagar",
    corporators: [
      { seat: 'A', name: "Varsha Bhimrao Sathe", party: "BJP" },
      { seat: 'B', name: "Pratik Prakash Kadam", party: "NCP" },
      { seat: 'C', name: "Rupali Dinesh Dhadve", party: "BJP" },
      { seat: 'D', name: "Bala (Pramod) Premchand Oswal", party: "BJP" },
    ],
  },
  {
    id: 40,
    name: "Kondhwa Budruk–Yeolewadi",
    corporators: [
      { seat: 'A', name: "Archana Amit Jagtap", party: "BJP" },
      { seat: 'B', name: "Vrushali Sunil Kamthe", party: "BJP" },
      { seat: 'C', name: "Tushar Puja Kadam", party: "BJP" },
      { seat: 'D', name: "Ranjana Kundalik Tilekar", party: "BJP" },
    ],
  },
  {
    id: 41,
    name: "Mohammadwadi–Undri",
    corporators: [
      { seat: 'A', name: "Prachi Ashish Alhat", party: "BJP" },
      { seat: 'B', name: "Nivrutti Dnyanoba Bandal", party: "NCP" },
      { seat: 'C', name: "Shweta Sachin Ghule", party: "NCP" },
      { seat: 'D', name: "Atul Narayan Tarwade", party: "BJP" },
    ],
  },
];

export function getElectoralWard(id: number): ElectoralWard | undefined {
  return electoralWards.find((w) => w.id === id);
}