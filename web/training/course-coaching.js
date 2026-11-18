'use strict';

// Original lesson notes. A cue's move sequence starts at the lesson position,
// so a note about a book continuation cannot fire in an unrelated variation.
const lessons = {
 'endgame-queen-net': [
  ['King and queen', 'Rey y dama', '王后对单王'],
  ['Capablanca moves the queen from h1 to c6. Trace the squares she covers from there. The black king has less room even though it is not in check. This gives your king time to come closer.',
   'Capablanca mueve la dama de h1 a c6. Fíjate en las casillas que domina desde allí. El rey negro tiene menos espacio aunque no esté en jaque. Así, tu rey gana tiempo para acercarse.',
   '卡帕布兰卡先把后从 h1 走到 c6。看看后从那里守住了哪些格子。黑王虽然没有被将军，能走的地方却少了。白王就有时间靠近。'],
  {line:['h1c6','e5d4'], square:'e1', text:[
   'The queen is already doing her job. In the book White brings the king to d2 instead of giving another queen move. The two pieces can take away more squares together.',
   'La dama ya cumple su tarea. En el libro, las blancas acercan el rey a d2 en vez de volver a mover la dama. Juntas, las dos piezas pueden quitarle más salidas al rey negro.',
   '后已经守住了许多格子。书里接着把白王走到 d2，让后留在原处。王和后一起，能封住更多的逃生格。']}
 ],
 'endgame-rook-box': [
  ['King and rook', 'Rey y torre', '王车对单王'],
  ['Put the rook on a7. The black king can still walk along the top row, but it cannot cross the seventh rank. Bring your king forward while the rook holds that line.',
   'Pon la torre en a7. El rey negro aún puede caminar por la última fila, pero no puede cruzar la séptima. Acerca tu rey mientras la torre vigila esa línea.',
   '把车摆到 a7。黑王还能沿最上面一行走，却过不了第七横线。让车守住这条线，白王趁机靠近。'],
  {line:['a1a7','h8g8'], square:'h1', text:[
   'The black king went to g8. Capablanca replies by moving the white king to g2. Working up the same file helps the white king get close enough to cover escapes when the rook gives check.',
   'El rey negro fue a g8. Capablanca responde llevando el rey blanco a g2. Subir por la misma columna ayuda al rey blanco a acercarse lo suficiente para cubrir las salidas cuando la torre dé jaque.',
   '黑王走到 g8。卡帕布兰卡把白王走到 g2，沿同一条纵线靠近。等车将军时，白王就能守住黑王的逃生格。']}
 ],
 'endgame-key-squares': [
  ['The king leads the pawn', 'El rey guía al peón', '王在兵前开路'],
  ['Your pawn on e2 is safe behind your king. Start by moving the king from f4 to e4. Capablanca advances the king as far as it can safely go while the pawn is still protected. Then the pawn can catch up.',
   'Tu peón de e2 está seguro detrás del rey. Empieza llevando el rey de f4 a e4. Capablanca adelanta el rey todo lo posible mientras el peón está a salvo. Después avanza el peón.',
   'e2 的白兵在王身后很安全。先把王从 f4 走到 e4。只要兵还是安全的，卡帕布兰卡就尽量让王先往前走，再让兵跟上。'],
  {line:['f4e4','f6e6'], square:'e2', text:[
   'The kings face each other across e5, so your king cannot go straight ahead. Move the pawn one square to e3. That hands Black the move without giving up your king’s place in front.',
   'Los reyes están frente a frente, con e5 en medio. Tu rey no puede seguir de frente. Avanza el peón una casilla hasta e3. Así les toca mover a las negras y tu rey sigue delante.',
   '两王隔着 e5 正对，白王不能再直走。把兵推进一格到 e3。这样轮到黑方走，而白王还能留在前面。']}
 ],
 'endgame-rook-pawn-draw': [
  ['The pawn on the edge', 'El peón del borde', '边兵与角落'],
  ['Your black king stands on a8, where White’s pawn must go to become a queen. Stay near that corner. The white king cannot step next to yours to push it away, and the pawn cannot drive you out of a8 by moving straight ahead.',
   'Tu rey negro está en a8, la casilla a la que el peón blanco debe llegar para convertirse en dama. Quédate cerca. El rey blanco no puede ponerse al lado del tuyo para echarlo, y el peón no puede expulsarte avanzando de frente.',
   '白兵必须走到 a8 才能升变。让黑王留在这个角落附近。白王不能贴到黑王身边把它赶走，白兵也不能靠直走把守在 a8 的王赶出去。']
 ],
 'endgame-lucena': [
  ['Lucena position', 'Posición de Lucena', '卢塞纳局面'],
  ['The pawn on f7 is one step from becoming a queen, but your king is standing on f8. If your king steps aside too soon, the black rook can chase it with checks. First give check with your rook from d1 to send the black king away.',
   'Al peón de f7 le falta un paso para convertirse en dama, pero tu rey ocupa f8. Si se aparta demasiado pronto, la torre negra podrá perseguirlo a base de jaques. Primero da jaque con tu torre desde d1 para alejar al rey negro.',
   'f7 的兵再走一步就能升后，可白王正站在 f8。如果白王急着让路，黑车就会连续将军。先把白车走到 d1 将军，把黑王赶远。'],
  {line:['e1d1','d7c7'], square:'d1', text:[
   'Now lift the rook to d4. From that row it can slide across and stand between your king and the checking rook. That is the “bridge”: the rook gives your king shelter so the pawn can reach f8.',
   'Ahora sube la torre a d4. Desde esa fila podrá cruzar y ponerse entre tu rey y la torre que da jaque. A eso se le llama «puente»: la torre protege al rey para que el peón llegue a f8.',
   '现在把白车提到 d4。它可以沿第四横线横移，挡在白王和将军的黑车之间。这就是所谓的「搭桥」：车给王挡将，让兵有机会走到 f8。']},
  {line:['e1d1','d7c6'], square:'f8', text:[
   'The black king has gone to c6. Your king can now step to e7 and guard the pawn from beside it. That frees f8 without leaving the pawn alone.',
   'El rey negro ha ido a c6. Tu rey ya puede pasar a e7 y proteger el peón desde al lado. Así deja libre f8 sin abandonar el peón.',
   '黑王走到了 c6。白王现在可以走到 e7，从旁边护住兵。这样既让出了 f8，又没有丢下白兵。']}
 ],
 'endgame-philidor': [
  ['Philidor position', 'Posición de Philidor', '菲利多局面'],
  ['You are defending with Black. Put the rook on b6. Along that row it stops the white king from coming forward. Wait for the e-pawn to advance before sending the rook behind White’s king to give checks.',
   'Defiendes con negras. Coloca la torre en b6. Desde esa fila impide que avance el rey blanco. Espera a que el peón de e avance antes de llevar la torre detrás del rey blanco para darle jaques.',
   '你执黑防守。先把车放到 b6，用第六横线挡住白王。等 e 兵向前走后，再把车移到白王后方连续将军。'],
  {line:['b8b6','e5e6'], square:'e6', text:[
   'The pawn has stepped ahead of its king. It can no longer shield the king from checks from below. Drop the rook back to b1 so it can give those checks from a distance.',
   'El peón se ha adelantado a su rey. Ya no lo protege de los jaques desde abajo. Retira la torre a b1 para poder dar esos jaques desde lejos.',
   '白兵已经走到王的前面，挡不住从下方来的将军了。把黑车撤到 b1，准备从远处将军。']}
 ],
 'endgame-two-bishops': [
  ['King and two bishops', 'Rey y dos alfiles', '王与双象'],
  ['Move the bishop from f1 to h3. After Black’s king steps to e7 in the book, the bishop from c1 goes to f4. Trace their neighboring diagonals. The black king cannot cross them, so your own king can walk up to help.',
   'Mueve el alfil de f1 a h3. En el libro, tras ir el rey negro a e7, el alfil de c1 va a f4. Sigue las dos diagonales vecinas: el rey negro no puede cruzarlas, así que tu rey puede acercarse para ayudar.',
   '先把 f1 的象走到 h3。书里黑王走到 e7 后，c1 的象再走到 f4。看看这两条相邻的斜线：黑王过不来，白王就能一步步靠近。']
 ],
 'endgame-bishop-knight': [
  ['King, bishop and knight', 'Rey, alfil y caballo', '王、象与马'],
  ['The black king is already on the edge near h8. That corner is dark, but your bishop moves on light squares. Send the bishop from f5 to h7 to keep the king from going toward h8. Your aim is to guide it toward a8, where the bishop can help give mate.',
   'El rey negro ya está en el borde, cerca de h8. Esa esquina es oscura y tu alfil va por casillas claras. Lleva el alfil de f5 a h7 para cerrar el camino hacia h8. Guía al rey hacia a8, donde el alfil sí podrá ayudar a dar mate.',
   '黑王已在边上，靠近深色角 h8，你的象却只走浅色格。先把象从 f5 走到 h7，堵住通往 h8 的路。争取把黑王赶到浅色角 a8，象才帮得上忙。'],
  {line:['f5h7','f8e8'],square:'f7',text:[
   'The black king has started moving left. Jump the knight to e5 to cover d7. That closes a route back toward the middle while you guide the king along the edge.',
   'El rey negro ha empezado a ir hacia la izquierda. Salta con el caballo a e5 para vigilar d7. Así cierras un camino hacia el centro mientras llevas al rey por el borde.',
   '黑王开始往左走了。把马跳到 e5，守住 d7。这样就能堵住黑王返回中央的一条路，继续沿着边线赶它。']}
 ],
 'endgames-direct-opposition': [
  ['Face the other king', 'Frente al otro rey', '两王对峙'],
  ['Move your king to f4. The kings will face one another across f3, and White must move first. Because kings cannot touch, White has to give way. Capablanca calls this arrangement direct opposition.',
   'Lleva tu rey a f4. Los reyes quedarán enfrentados, con f3 en medio, y le tocará mover a las blancas. Como los reyes no pueden estar juntos, el blanco tendrá que ceder. Capablanca llama a esto oposición directa.',
   '把黑王走到 f4。两王隔着 f3 正对，接下来轮到白方走。王不能紧挨着对方的王，所以白王必须让开。卡帕布兰卡把这种站位称为「直接对王」。']
 ],
 'endgames-support-promotion': [
  ['Guard the promotion square', 'Protege la casilla de coronación', '守住升变格'],
  ['If you turn the pawn into a queen now, the black king can take it. Bring your king to c7 first. From there it guards b8, the square where the pawn becomes a queen.',
   'Si conviertes el peón en dama ahora, el rey negro podrá capturarla. Lleva primero tu rey a c7. Desde allí protege b8, la casilla donde coronará el peón.',
   '如果现在升后，黑王就能吃掉新后。先让白王走到 c7，守住白兵要升变的 b8。']
 ],
 'endgames-king-catches-runner': [
  ['Catch the pawn in time', 'Alcanza el peón a tiempo', '及时追上兵'],
  ['The pawn on g2 only needs one more step. Your king can take it now. With only two kings left, neither side can give checkmate, so the game is drawn.',
   'Al peón de g2 le falta un solo paso. Tu rey puede tomarlo ahora. Con solo dos reyes, ninguno puede dar mate y la partida acaba en tablas.',
   'g2 的黑兵只差一步就能升变。白王现在就能吃掉它。棋盘上只剩两个王时，双方都无法将杀，结果是和棋。']
 ],
 'endgames-rook-behind-runner': [
  ['Get behind the pawn', 'Ponte detrás del peón', '到兵的后方'],
  ['Move the rook to a4, behind the pawn on a2. From there it can follow the pawn down the a-file, with enough room to give checks if the black king steps away.',
   'Lleva la torre a a4, detrás del peón de a2. Desde allí puede seguirlo por la columna a y conserva espacio para dar jaques si el rey negro se aparta.',
   '把白车走到 a4，站在 a2 黑兵的后方。黑兵再往前也逃不出这条纵线；黑王一旦离开，白车还有距离可以将军。']
 ],
 'endgames-promotion-tempo': [
  ['Promote with check', 'Corona dando jaque', '带将升变'],
  ['Both pawns can become queens on their next move. Your new queen on g8 attacks the black king along the diagonal to b3. Black must answer that check before moving its own pawn.',
   'Los dos peones están a un paso de coronar. Tu nueva dama en g8 ataca al rey negro por la diagonal que llega a b3. Las negras deben resolver el jaque antes de mover su peón.',
   '两个兵都只差一步就能升变。白兵在 g8 升后的同时，沿斜线将军，攻击 b3 的黑王。黑方必须先解将，不能马上推进自己的兵。']
 ],
 'endgames-bishop-promotion-diagonal': [
  ['Watch the last square', 'Vigila la última casilla', '盯住最后一格'],
  ['The bishop does not have to reach the pawn itself. From d5 it can watch h1 along the diagonal. If the pawn becomes a queen there, the bishop can capture it.',
   'El alfil no tiene que alcanzar al peón. Desde d5 puede vigilar h1 por la diagonal. Si el peón corona allí, el alfil puede capturar la nueva dama.',
   '象不用追上黑兵本身。从 d5 沿斜线就能守住 h1。黑兵如果在那里升后，白象就能吃掉它。']
 ],
 'endgames-knight-catches-runner': [
  ['A knight’s last jump', 'El último salto del caballo', '马的最后一跳'],
  ['The knight on f3 can jump straight to h2 and take the pawn, even though the pawn is near the edge. A king and a single knight cannot checkmate a lone king.',
   'El caballo de f3 puede saltar a h2 y tomar el peón, aunque esté junto al borde. Un rey y un solo caballo no pueden dar mate a un rey solitario.',
   '虽然黑兵已到边上，f3 的马仍能跳到 h2 吃掉它。单马和王无法将杀只有一个王的对手。']
 ]
};

Object.assign(lessons, {
 'strategy-rook-pawn-march': [
  ['Push the h-pawn', 'Avanza el peón de h', '推进 h 兵'],
  ['Look at the pawns on d4, d5, e5 and e6. They cannot move straight past each other. That gives White time to push the pawn on h2 toward the black king. Black can still look for play on the other side, where the white pawn on c3 is a target.',
   'Mira los peones de d4, d5, e5 y e6. Se estorban y no pueden avanzar de frente. Eso da tiempo a las blancas para llevar el peón de h2 hacia el rey negro. Las negras aún pueden buscar juego en el otro lado, donde está el peón blanco de c3.',
   '看看 d4、d5、e5、e6 的兵。它们彼此挡住，不能直着往前走。白方因此有时间把 h2 的兵推向黑王。黑方仍可在另一翼找机会，那里的 c3 白兵就是一个目标。']
 ],
 'strategy-provoke-a-target': [
  ['A knight asks a question', 'El caballo plantea un problema', '用马给黑方出题'],
  ['AlphaZero jumped from f3 to g5. Notice how close the knight gets to the pawns in front of the black king. The e5 pawn also protects f6, so a white piece that reaches f6 can be hard to chase away.',
   'AlphaZero saltó de f3 a g5. Fíjate en lo cerca que queda el caballo de los peones que protegen al rey negro. El peón de e5 también protege f6, así que una pieza blanca que llegue allí puede ser difícil de desalojar.',
   'AlphaZero 把马从 f3 跳到 g5。注意它离黑王前面的兵有多近。e5 的白兵还守着 f6，白子一旦落在 f6，黑方就不容易把它赶走。']
 ],
 'strategy-restrict-and-reroute': [
  ['Give the knight a new route', 'Busca otra ruta para el caballo', '给马换条路'],
  ['Black just moved the h-pawn to h6 to attack the knight. AlphaZero tucked the knight away on h3. That square looks quiet, but it leaves the queen free to go to f3, and the knight can later come back through f4 toward h5.',
   'Las negras acaban de mover el peón a h6 para atacar al caballo. AlphaZero lo retiró a h3. Parece una casilla tranquila, pero deja libre f3 para la dama y el caballo podrá volver por f4 hacia h5.',
   '黑方刚把兵推到 h6，攻击白马。AlphaZero 把马退到 h3。这个位置看似不起眼，却给白后腾出了 f3，马以后还能经 f4 转到 h5。']
 ],
 'strategy-open-g-file': [
  ['Use the column your pawn left', 'Aprovecha la columna que dejó el peón', '利用兵让出的纵线'],
  ['White’s g-pawn took a piece on f3, leaving no white pawn in the g-file. That opens a path for a white rook toward the black king. The pawn now on f3 does another job: it guards e4, where a black knight might otherwise land.',
   'El peón blanco de g capturó en f3 y dejó su columna sin peones blancos. Por allí podrá acercarse una torre al rey negro. El peón que ahora está en f3 cumple otra tarea: vigila e4, donde podría instalarse un caballo negro.',
   '白方的 g 兵吃到 f3 后，g 纵线让了出来，白车可以沿它接近黑王。现在 f3 的兵还守住了 e4，不让黑马轻易跳到那里。']
 ],
 'strategy-center-before-wing': [
  ['Secure the middle first', 'Asegura primero el centro', '先稳住中央'],
  ['AlphaZero pushed the f3 pawn to f4. The bishop on d3 and knight on c3 still cover e4. The pawn now controls e5 and has made f3 available for the queen. From f3 the queen can head to h3, closer to the black king.',
   'AlphaZero avanzó el peón de f3 a f4. El alfil de d3 y el caballo de c3 siguen vigilando e4. El peón ahora controla e5 y deja f3 libre para la dama. Desde allí puede ir a h3, más cerca del rey negro.',
   'AlphaZero 把 f3 的兵推进到 f4。d3 的象和 c3 的马仍守着 e4。白兵改守 e5，腾出 f3 给白后。白后可以从 f3 转到 h3，朝黑王靠近。']
 ],
 'strategy-active-bishop': [
  ['Move the bishop with a purpose', 'Mueve el alfil con un propósito', '让象走得有用'],
  ['Your bishop is already looking at h7 from d3. Can it stay on that diagonal and also threaten the queen on d7? Look for the square where those two diagonals meet.',
   'Tu alfil ya apunta a h7 desde d3. ¿Puede quedarse en esa diagonal y amenazar también a la dama de d7? Busca la casilla donde se cruzan las dos diagonales.',
   'd3 的白象已经瞄着 h7。它能不能留在这条斜线上，同时威胁 d7 的黑后？找一找这两条斜线的交点。'],
  {line:['d3f5'],square:'f5',text:['Trace both diagonals from f5. One goes to the queen on d7 and the other toward h7. A move like this gives the other side an immediate problem while preparing a longer attack.','Sigue las dos diagonales desde f5. Una llega a la dama de d7 y la otra apunta a h7. Esta jugada plantea un problema inmediato mientras prepara un ataque más largo.','从 f5 看两条斜线：一条通向 d7 的后，另一条指向 h7。一步棋既让对方立即有事要处理，也为后续进攻做准备。']}
 ],
 'strategy-file-and-diagonal': [
  ['Two paths to the king', 'Dos caminos hacia el rey', '从两条线接近王'],
  ['When the bishop returns to d3, trace its diagonal through e4, f5 and g6 toward h7. The g1 rook approaches along a different line. Black has to watch both the h7 pawn and the squares in front of the rook.',
   'Cuando el alfil vuelva a d3, sigue su diagonal por e4, f5 y g6 hasta h7. La torre de g1 se acerca por otra línea. Las negras deben vigilar tanto el peón de h7 como las casillas delante de la torre.',
   '象退回 d3 后，沿 e4、f5、g6 看向 h7。g1 的车则从另一条线上接近。黑方得同时照看 h7 的兵和白车前方的格子。']
 ],
 'strategy-rook-lift': [
  ['Make room for the second rook', 'Haz sitio a la segunda torre', '给第二辆车腾地方'],
  ['The rook on a1 is far from the black king. AlphaZero sent its other rook from g1 to g5. That clears g1 so the a1 rook can travel across the bottom row and support it.',
   'La torre de a1 queda lejos del rey negro. AlphaZero llevó su otra torre de g1 a g5. Así dejó g1 libre para que la torre de a1 cruzara la primera fila y la apoyara.',
   'a1 的车离黑王很远。AlphaZero 先把另一辆车从 g1 提到 g5，腾出 g1，让 a1 的车沿底线横过来接应。'],
  {line:['g1g5','h7h6'],square:'g5',text:['Black’s pawn attacks the front rook. In the game AlphaZero brought the second rook to g1 anyway. With both rooks lined up, White can take back on g5 if Black captures there.','El peón negro ataca a la primera torre. En la partida, AlphaZero llevó la segunda torre a g1 de todos modos. Con las dos torres en la misma columna, las blancas pueden recapturar en g5 si las negras toman allí.','黑兵攻击前面的车。实战中，AlphaZero 仍然把第二辆车摆到 g1。两车排在同一条纵线上，黑兵若吃到 g5，后面的车就能吃回去。']}
 ],
 'strategy-sacrifice-for-lines': [
  ['Bring the rook into the game', 'Incorpora la torre al ataque', '让车加入进攻'],
  ['Black’s queen took on f3 and White is a pawn down. Look at the g-file: White’s g-pawn is gone, so the rook from h1 can aim straight at Black’s pawn on g7. White’s own king is still in the middle. In the game it later castled toward the a-file to get away from the fight.',
   'La dama negra capturó en f3 y las blancas tienen un peón menos. Mira la columna g: el peón blanco de g ya no está, así que la torre de h1 puede apuntar directamente al peón negro de g7. El rey blanco sigue en el centro. En la partida enrocó largo más adelante para alejarse de la lucha.',
   '黑后吃到 f3，白方少了一个兵。看看 g 纵线：白方的 g 兵已经不在，h1 的车可以从这条线直指 g7 的黑兵。白王还在中央；实战中，它后来向 a 纵线方向长易位，避开了交战的地方。']
 ]
});

Object.assign(lessons, {
 'learn-king-coordinates': [
  ['Your king and the board','Tu rey y el tablero','认识王和棋盘'],
  ['Your king can step one square in any direction. The two kings may never stand next to each other. Take a few steps with your king and see where it can go.',
   'Tu rey puede dar un paso en cualquier dirección. Los dos reyes nunca pueden estar juntos. Prueba a mover tu rey unas cuantas veces y fíjate adónde puede ir.',
   '王每次可以朝任意方向走一格，但两个王不能紧挨着。先用你的王走几步，看看它能到哪些格子。']
 ],
 'learn-stop-the-pawn': [
  ['Catch the runaway pawn','Atrapa el peón al paso','追上逃跑的兵'],
  ['The black pawn is headed for the bottom row. If it gets there, it can become a queen. Take a diagonal path with your king so you can move across the board and toward the pawn’s destination at the same time.',
   'El peón negro se dirige a la última fila. Si llega, puede convertirse en dama. Lleva tu rey en diagonal para cruzar el tablero y acercarte al destino del peón a la vez.',
   '黑兵正往棋盘底线走。走到底就能升后。让白王斜着追，这样既能向左靠近黑兵，也能向下接近它的终点。']
 ],
 'learn-queen-and-mate': [
  ['The queen, check and checkmate','La dama, el jaque y el mate','后、将军与将杀'],
  ['Your queen moves any number of clear squares in a straight line, including diagonally. She can take away several of the black king’s choices at once. Keep her out of its reach until your king can protect her.',
   'Tu dama recorre tantas casillas libres como quieras en fila, columna o diagonal. Puede quitarle varias salidas al rey negro a la vez. Déjala fuera de su alcance hasta que tu rey pueda protegerla.',
   '后能沿横线、纵线或斜线走任意多格，但不能越过棋子。它能同时封住黑王的好几条路。在白王能保护它之前，别让黑王轻易吃到它。']
 ],
 'learn-pawn-promotion': [
  ['Promote your pawn','Corona tu peón','让兵升变'],
  ['A pawn may take two steps from its starting square if both squares ahead are clear. When this pawn reaches a8, you can trade it for a queen, rook, bishop or knight. A queen is usually the easiest piece to checkmate with.',
   'Un peón puede avanzar dos casillas desde su posición inicial si las dos están libres. Al llegar a a8, puedes cambiarlo por dama, torre, alfil o caballo. Con la dama suele ser más fácil dar mate.',
   '兵从起点出发时，如果前面两格都空着，可以一次走两格。这个兵到了 a8，可以换成后、车、象或马。通常用后最容易将杀。']
 ],
 'learn-pawn-captures': [
  ['Pawns capture diagonally','Los peones capturan en diagonal','兵斜着吃子'],
  ['Look at the two pawns on the a-file. The white pawn on a6 cannot step into a7 because another pawn is there. A pawn can only move straight ahead into an empty square.',
   'Mira los dos peones de la columna a. El peón blanco de a6 no puede entrar en a7 porque ya hay un peón allí. Un peón solo avanza de frente si la casilla está vacía.',
   '看看 a 纵线的两个兵。a7 已经被黑兵占住，a6 的白兵就不能直走过去。兵只能直着走进空格。']
 ],
 'learn-rook-and-mate': [
  ['The rook and king work together','La torre y el rey trabajan juntos','王与车配合'],
  ['A rook travels along a row or column. Once the black pawn is gone, try using the rook to mark off a row the black king cannot cross. Your king can come closer while the rook keeps that boundary.',
   'La torre se mueve por filas y columnas. Cuando desaparezca el peón negro, prueba a usarla para cerrar una fila que el rey negro no pueda cruzar. Tu rey podrá acercarse mientras la torre mantiene la barrera.',
   '车沿横线或纵线走。吃掉黑兵后，试着用车封住一条横线，让黑王过不来。车守住这条线时，白王就能一步步靠近。']
 ],
 'learn-bishop': [
  ['The bishop stays on its color','El alfil permanece en su color','象只走同色格'],
  ['Follow the diagonal from your bishop on d4 through c3 to b2. It can capture the pawn there in one move. The pawn on a4 is on the other color, so your king may have to help.',
   'Sigue la diagonal de tu alfil desde d4, pasando por c3, hasta b2. Puede tomar ese peón de una sola jugada. El peón de a4 está en el otro color, así que quizá necesites la ayuda del rey.',
   '从 d4 的白象沿斜线看过去，经过 c3 就到 b2，象一步就能吃掉那里的兵。a4 的兵在另一种颜色的格子上，所以可能要请白王帮忙。']
 ],
 'learn-knight': [
  ['The knight jumps','El caballo salta','马可以跳过棋子'],
  ['From d5, count two columns left and one row down. That takes your knight to b4, where it can capture. A knight can jump over pieces, but its landing square must be empty or hold an enemy piece.',
   'Desde d5, cuenta dos columnas a la izquierda y una fila hacia abajo. Tu caballo llega a b4 y puede capturar. El caballo salta por encima de las piezas, pero solo puede caer en una casilla vacía u ocupada por una pieza rival.',
   '从 d5 往左数两列，再向下数一行，就是 b4。白马可以跳到那里吃兵。马能越过棋子，但落点必须是空格，或者有对方的棋子。']
 ],
 'learn-en-passant': [
  ['En passant','Captura al paso','吃过路兵'],
  ['Black’s pawn just went two squares from d7 to d5, passing d6. Your pawn on e5 may capture it as if it had stopped on d6. This special capture is only available now.',
   'El peón negro acaba de avanzar dos casillas de d7 a d5, pasando por d6. Tu peón de e5 puede tomarlo como si se hubiera detenido en d6. Esta captura especial solo vale ahora.',
   '黑兵刚从 d7 一步走到 d5，经过 d6。e5 的白兵可以像黑兵只走到 d6 那样吃掉它。这个机会只在紧接着的一步有效。']
 ],
 'learn-castle-king': [
  ['Castle kingside','Enroque corto','王翼易位'],
  ['Castling moves two pieces at once. Move your king from e1 to g1 and the rook will land on f1. Neither piece may have moved before, the path must be empty, and the king cannot start in, cross or land in check.',
   'Con el enroque mueves dos piezas a la vez. Lleva el rey de e1 a g1 y la torre quedará en f1. Ninguna de las dos piezas puede haberse movido antes, el camino debe estar libre y el rey no puede salir de un jaque, atravesarlo ni quedar en él.',
   '易位一步能动两枚棋子。把王从 e1 走到 g1，车就会到 f1。王和车此前都不能动过，中间要空着；王不能在被将军时易位，也不能经过或到达受攻击的格子。']
 ],
 'learn-castle-queen': [
  ['Castle queenside','Enroque largo','后翼易位'],
  ['Move the king from e1 to c1. The rook from a1 lands next to it on d1. The king never steps onto b1, but b1 still has to be empty for the rook to pass.',
   'Mueve tu rey de e1 a c1. La torre de a1 quedará a su lado en d1. El rey no pisa b1, pero esa casilla debe estar libre para que pase la torre.',
   '把王从 e1 走到 c1，a1 的车会来到它旁边的 d1。王虽不经过 b1，但车要经过，所以 b1 也必须空着。']
 ],
 'learn-repetition': [
  ['Threefold repetition','Triple repetición','三次重复局面'],
  ['Follow the kings back and forth. A position repeats when the same pieces are on the same squares, the same side is to move, and the same moves are available, including castling and en passant. The third occurrence can be a draw.',
   'Sigue el recorrido de ida y vuelta de los reyes. La posición se repite si las piezas ocupan las mismas casillas, le toca mover al mismo bando y se conservan las mismas opciones, incluidos el enroque y la captura al paso. La tercera vez puede dar tablas.',
   '让两个王来回走。棋子摆法、轮到哪方走，以及易位和吃过路兵等走棋权利都相同，才算同一局面。第三次出现时可以判和。']
 ],
 'learn-stalemate': [
  ['Stalemate is a draw','El ahogado son tablas','逼和是和棋'],
  ['Look at the black king in the corner. Move your queen to c7 and see what happens when it is Black’s turn.',
   'Mira al rey negro en la esquina. Lleva tu dama a c7 y observa qué ocurre cuando les toca mover a las negras.',
   '看看角落里的黑王。把白后走到 c7，再看轮到黑方走时会发生什么。']
 ]
});

module.exports = lessons;
