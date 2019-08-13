
\ ********************** PER File **********************

?EXISTS DL.STAT SWAP DROP .IF 1 DL.STAT .THEN
_END NEW $$$.RUN FORGET $$$.RUN
GetPersistentTop  **NodeRedTester**
1 10 -2147483648 $TABLE {stPublicListOfStrategyTags 
PersistentMAKECHECK

\ ********************** CRN File **********************

_END NEW $$$.RUN
: FILENAME  ." NodeRedTester " ;
: FILENAME>$ " NodeRedTester" SWAP $MOVE ;
1 0 $VAR *_HSV_SEMA 
1024 0 $VAR *_HSV_TEMP 
200 0 $VAR *_HSV_INIT_IO 
0 IVAR ^_HNV_INIT_IO 
0 TASK  &_INIT_IO
0 TASK &Powerup
0 IVAR ^bAlwaysOff
0 IVAR ^bAlwaysOn
0 2IVAR ^d1
0 2IVAR ^d2
0 2IVAR ^d3
0 TVAR ^dt1
0 FVAR ^f1
0 FVAR ^f2
0 FVAR ^f3
0 FVAR ^fAlways0
0 FVAR ^fAlways1
0 FVAR ^fAlways123Dot456
0 FVAR ^fAlwaysNan
0 FVAR ^fAlwaysNeg1
0 FVAR ^fAlwaysNeg123Dot456
0 FVAR ^fAlwaysNegINF
0 FVAR ^fAlwaysPosINF
0 IVAR ^n1
0 IVAR ^n2
0 IVAR ^n3
0 IVAR ^n4
0 IVAR ^n5
0 IVAR ^n6
0 IVAR ^n7
0 IVAR ^nAlways0
0 IVAR ^nAlways1
0 IVAR ^nAlways123
0 IVAR ^nAlways2147483647
0 IVAR ^nAlwaysNeg1
0 IVAR ^nAlwaysNeg2147483648
0 IVAR ^nAlwaysNeg234
0 2IVAR ^nn1
0 2IVAR ^nn2
0 2IVAR ^nn3
0 2IVAR ^nnAlways0
0 2IVAR ^nnAlways1
0 2IVAR ^nnAlways2147483647
0 2IVAR ^nnAlways2147483648
0 2IVAR ^nnAlways9223372036854775807
0 2IVAR ^nnAlwaysNeg
0 2IVAR ^nnAlwaysNeg9223372036854775808
0 UTVAR ^ut1
1024 0 $VAR *s1 
1024 0 $VAR *s2 
1024 0 $VAR *s3 
1024 0 $VAR *s4 
1024 0 $VAR *s5 
10 0 $VAR *sAlways123CRLF 
10 0 $VAR *sAlways456CR 
10 0 $VAR *sAlways789LF 
5 0 $VAR *sAlwaysABC 
10 0 $VAR *sAlwaysEmpty 
25 0 $VAR *sAlwaysQuoteQwertyQuote 
10 0 $VAR *sAlwaysSpace 
100 0 FTABLE }ft1
50 0 FTABLE }ft2
10 0 FTABLE }ft3
100 0 2ITABLE }nnt1
50 0 2ITABLE }nnt2
10 0 2ITABLE }nnt3
100 0 ITABLE }nt1
50 0 ITABLE }nt2
10 0 ITABLE }nt3
100 100 0 $TABLE {st1 
50 100 0 $TABLE {st2 
10 1024 0 $TABLE {st3 
nullTASK 0 POINTER PTR_pcht1
nullFVAR 0 POINTER PTR_pf1
nullIVAR 0 POINTER PTR_pn1
nullITABLE 0 POINTER PTR_pnt1
null$VAR 0 POINTER PTR_ps1
10 0 PTABLE PTBL_pt1
20 0 PTABLE PTBL_pt2

$0000000000000000.. 32769 3.000000 0.010000 0.000000 2001 $7F000001 0 MBOARD %Learning_Center
SPOINT 0.0 INPUT 0 %Learning_Center
    0 POINT ~diSwitchD0
SPOINT 0.0 INPUT 1 %Learning_Center
    0 POINT ~diSwitchD1
SPOINT 0.0 INPUT 2 %Learning_Center
    0 POINT ~diButtonD2
SPOINT 0.0 COUNTER 3 %Learning_Center
    0 POINT ~diButtonD3
SPOINT 0.0 OUTPUT 4 %Learning_Center
    0 POINT ~doAlarmD4
SPOINT 0.0 OUTPUT 5 %Learning_Center
    0 POINT ~doLedD5
SPOINT 0.0 OUTPUT 6 %Learning_Center
    0 POINT ~doLedD6
SPOINT 0.0 OUTPUT 7 %Learning_Center
    0 POINT ~doLedD7
APOINT    0.0000 $A7 8 %Learning_Center 0 POINT ~aoMeterA8
APOINT  -40.0000 $4 12 %Learning_Center 0 POINT ~aiTemperatureA12
APOINT  -10.0000 $C 16 %Learning_Center 0 POINT ~aiPotA16
: 0_0
0 JUMP ;
: 0_46
3 LINE.NUM 0 ^bAlwaysOff @! 
4 LINE.NUM ^bAlwaysOn  TRUE@! 
5 LINE.NUM 0 I>F ^fAlways0 @! 
6 LINE.NUM 1 I>F ^fAlways1 @! 
7 LINE.NUM 2143289344 ^fAlwaysNan  @! 
8 LINE.NUM 2139095040 ^fAlwaysPosINF  @! 
9 LINE.NUM -8388608 ^fAlwaysNegINF  @! 
10 LINE.NUM NEXTERROR 
11 LINE.NUM 1.23456001e+002 ^fAlways123Dot456 @! 
12 LINE.NUM -1 I>F ^fAlwaysNeg1 @! 
13 LINE.NUM -1.23456001e+002 ^fAlwaysNeg123Dot456 @! 
14 LINE.NUM 0 ^nAlways0 @! 
15 LINE.NUM 1 ^nAlways1 @! 
16 LINE.NUM 123 ^nAlways123 @! 
17 LINE.NUM -1 ^nAlwaysNeg1 @! 
18 LINE.NUM -234 ^nAlwaysNeg234 @! 
19 LINE.NUM 2147483647 ^nAlways2147483647 @! 
20 LINE.NUM -2147483648 ^nAlwaysNeg2147483648 @! 
21 LINE.NUM " " *sAlwaysEmpty  $MOVE 
22 LINE.NUM "  " *sAlwaysSpace  $MOVE 
23 LINE.NUM *_HSV_SEMA Acquire1String " 123"  *_HSV_TEMP $MOVE 13  *_HSV_TEMP $APPEND 10  *_HSV_TEMP $APPEND *_HSV_TEMP *sAlways123CRLF $MOVE Release1String 
24 LINE.NUM *_HSV_SEMA Acquire1String " 456"  *_HSV_TEMP $MOVE 13  *_HSV_TEMP $APPEND *_HSV_TEMP *sAlways456CR $MOVE Release1String 
25 LINE.NUM *_HSV_SEMA Acquire1String " 789"  *_HSV_TEMP $MOVE 10  *_HSV_TEMP $APPEND *_HSV_TEMP *sAlways789LF $MOVE Release1String 
26 LINE.NUM *_HSV_SEMA Acquire1String " " *_HSV_TEMP $MOVE 34  *_HSV_TEMP $APPEND " Qwerty"  *_HSV_TEMP $CAT 34  *_HSV_TEMP $APPEND *_HSV_TEMP *sAlwaysQuoteQwertyQuote $MOVE Release1String 
27 LINE.NUM 0 I>D ^nnAlways0 @! 
28 LINE.NUM 1 I>D ^nnAlways1 @! 
29 LINE.NUM 2147483647 I>D ^nnAlways2147483647 @! 
30 LINE.NUM -2147483648 I>D ^nnAlways2147483648 @! 
31 LINE.NUM 9223372036854775807.. ^nnAlways9223372036854775807 @! 
32 LINE.NUM -9223372036854775808.. ^nnAlwaysNeg9223372036854775808 @! 
34 LINE.NUM 25  DELAY 
-1 JUMP ;
T: T0
DUMMY
0_0
0_46
T;
&Powerup ' T0 SETTASK
CREATE T.ARRAY
&Powerup ,
 0 ,
CREATE V.ARRAY
^bAlwaysOff ,
^bAlwaysOn ,
^d1 ,
^d2 ,
^d3 ,
^f1 ,
^f2 ,
^f3 ,
^fAlways0 ,
^fAlways1 ,
^fAlways123Dot456 ,
^fAlwaysNan ,
^fAlwaysNeg1 ,
^fAlwaysNeg123Dot456 ,
^fAlwaysNegINF ,
^fAlwaysPosINF ,
^n1 ,
^n2 ,
^n3 ,
^n4 ,
^n5 ,
^n6 ,
^n7 ,
^nAlways0 ,
^nAlways1 ,
^nAlways123 ,
^nAlways2147483647 ,
^nAlwaysNeg1 ,
^nAlwaysNeg2147483648 ,
^nAlwaysNeg234 ,
^nn1 ,
^nn2 ,
^nn3 ,
^nnAlways0 ,
^nnAlways1 ,
^nnAlways2147483647 ,
^nnAlways2147483648 ,
^nnAlways9223372036854775807 ,
^nnAlwaysNeg ,
^nnAlwaysNeg9223372036854775808 ,
*s1 ,
*s2 ,
*s3 ,
*s4 ,
*s5 ,
*sAlways123CRLF ,
*sAlways456CR ,
*sAlways789LF ,
*sAlwaysABC ,
*sAlwaysEmpty ,
*sAlwaysQuoteQwertyQuote ,
*sAlwaysSpace ,
*_HSV_SEMA ,
*_HSV_TEMP ,
 0 ,
CREATE TI.ARRAY
^dt1 ,
^ut1 ,
 0 ,
CREATE PTR.ARRAY
Ptr' PTR_pcht1 ,
Ptr' PTR_pf1 ,
Ptr' PTR_pn1 ,
Ptr' PTR_pnt1 ,
Ptr' PTR_ps1 ,
 0 ,
CREATE TA.ARRAY 
}ft1 ,
}ft2 ,
}ft3 ,
}nnt1 ,
}nnt2 ,
}nnt3 ,
}nt1 ,
}nt2 ,
}nt3 ,
{st1 ,
{st2 ,
{st3 ,
 0 ,
CREATE PTRTABLE.ARRAY 
PTBL_pt1 ,
PTBL_pt2 ,
 0 ,
CREATE B.ARRAY
%Learning_Center ,
 0 ,
CREATE P.ARRAY
~diButtonD2 ,
~diButtonD3 ,
~diSwitchD0 ,
~diSwitchD1 ,
~doAlarmD4 ,
~doLedD5 ,
~doLedD6 ,
~doLedD7 ,
~aiPotA16 ,
~aiTemperatureA12 ,
~aoMeterA8 ,
 0 ,
CREATE PID.ARRAY
 0 ,
CREATE E/R.ARRAY
 0 ,
CREATE E/RGROUP.ARRAY
 0 ,
: CONFIG_PORTS
;
: W_INIT_IO
CONFIG_PORTS
$00000000000111FF.. %Learning_Center ENABLES!
" %Learning_Center  (1/1)" *_HSV_INIT_IO $MOVE 0 ^_HNV_INIT_IO @!
%Learning_Center DISABLE
 " Initializing variables" *_HSV_INIT_IO $MOVE
0 ^bAlwaysOff @!
0 ^bAlwaysOn @!
0.. ^d1 @!
0.. ^d2 @!
0.. ^d3 @!
0.0 ^dt1 @!
0.00000000 ^f1 @!
0.00000000 ^f2 @!
0.00000000 ^f3 @!
0.00000000 ^fAlways0 @!
0.00000000 ^fAlways1 @!
0.00000000 ^fAlways123Dot456 @!
0.00000000 ^fAlwaysNan @!
0.00000000 ^fAlwaysNeg1 @!
0.00000000 ^fAlwaysNeg123Dot456 @!
0.00000000 ^fAlwaysNegINF @!
0.00000000 ^fAlwaysPosINF @!
0 ^n1 @!
0 ^n2 @!
0 ^n3 @!
0 ^n4 @!
0 ^n5 @!
0 ^n6 @!
0 ^n7 @!
0 ^nAlways0 @!
0 ^nAlways1 @!
0 ^nAlways123 @!
0 ^nAlways2147483647 @!
0 ^nAlwaysNeg1 @!
0 ^nAlwaysNeg2147483648 @!
0 ^nAlwaysNeg234 @!
0.. ^nn1 @!
0.. ^nn2 @!
0.. ^nn3 @!
0.. ^nnAlways0 @!
0.. ^nnAlways1 @!
0.. ^nnAlways2147483647 @!
0.. ^nnAlways2147483648 @!
0.. ^nnAlways9223372036854775807 @!
0.. ^nnAlwaysNeg @!
0.. ^nnAlwaysNeg9223372036854775808 @!
0.0 ^ut1 SetTimer
0.00000000 0 -1 }ft1 InitTable
0.00000000 0 -1 }ft2 InitTable
0.00000000 0 -1 }ft3 InitTable
0.. 0 -1 }nnt1 InitTable
0.. 0 -1 }nnt2 InitTable
0.. 0 -1 }nnt3 InitTable
0 0 -1 }nt1 InitTable
0 0 -1 }nt2 InitTable
0 0 -1 }nt3 InitTable
" "
 *s1 $MOVE
" "
 *s2 $MOVE
" "
 *s3 $MOVE
" "
 *s4 $MOVE
" "
 *s5 $MOVE
" "
 *sAlways123CRLF $MOVE
" "
 *sAlways456CR $MOVE
" "
 *sAlways789LF $MOVE
" "
 *sAlwaysABC $MOVE
" "
 *sAlwaysEmpty $MOVE
" "
 *sAlwaysQuoteQwertyQuote $MOVE
" "
 *sAlwaysSpace $MOVE
 " "
0 -1 {st1 Init$Table
 " "
0 -1 {st2 Init$Table
 " "
0 -1 {st3 Init$Table
0 MoveToPointer PTR_pcht1
0 MoveToPointer PTR_pf1
0 MoveToPointer PTR_pn1
0 MoveToPointer PTR_pnt1
0 MoveToPointer PTR_ps1
9 FOR 0 I PTBL_pt1 TABLE! NEXT
19 FOR 0 I PTBL_pt2 TABLE! NEXT
 " " *_HSV_INIT_IO $MOVE
;
T: T_INIT_IO
W_INIT_IO
&Powerup START.T DROP
T;
&_INIT_IO ' T_INIT_IO  SETTASK
   : _RUN
   CLEARERRORS
   &_INIT_IO START.T DROP
   ;
: DATESTAMP ." 08/13/19 " ;
: TIMESTAMP ." 16:26:22 " ;
: CRCSTAMP  ." E72465BCF2E90C8480D7225B0663BB23 " ;
MAKECHECK
CLEAR.BREAKS

\ ********************** INC File **********************

\ ""DOWNLOAD_COMPRESSION_OFF
MAKECHECK 
0 0 0 BP! 
0 0 1 BP! 
0 0 2 BP! 
0 0 3 BP! 
0 0 4 BP! 
0 0 5 BP! 
0 0 6 BP! 
0 0 7 BP! 
0 0 8 BP! 
0 0 9 BP! 
0 0 10 BP! 
0 0 11 BP! 
0 0 12 BP! 
0 0 13 BP! 
0 0 14 BP! 
0 0 15 BP! 
0 I!AUTORUN 
?EXISTS DL.STAT SWAP DROP .IF 0 DL.STAT .THEN
