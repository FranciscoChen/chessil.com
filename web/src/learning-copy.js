/* Copy for teaching events that are shared across positions. */
window.ChessilLearningCopy = {
 file: f => [
  `A file is a column. This one is called the ${f}-file. The letters run from a to h as seen from White’s side.`,
  `Una columna va de un extremo al otro del tablero. Esta es la columna ${f}. Las letras van de a a h desde el lado de las blancas.`,
  `棋盘上竖着的一列叫纵线。这是 ${f} 纵线。从白方看，纵线用 a 到 h 标记。`
 ],
 rank: r => [
  `A rank is a row. This is rank ${r}. Rank 1 is the row where the white king starts.`,
  `Una fila recorre el tablero de lado a lado. Esta es la fila ${r}. La primera fila es donde empieza el rey blanco.`,
  `棋盘上横着的一行叫横线。这是第 ${r} 横线。白王从第 1 横线出发。`
 ],
 square: (f, r) => [
  `Read the letter first and the number second. Where file ${f} meets rank ${r}, you get ${f + r}. That is your king’s destination.`,
  `Lee primero la letra y luego el número. La columna ${f} y la fila ${r} se cruzan en ${f + r}. Lleva allí tu rey.`,
  `先读字母，再读数字。${f} 纵线和第 ${r} 横线相交的格子是 ${f + r}。把王走到这里。`
 ],
 recall: s => [
  `Find ${s} from its letter and number. Follow that column and row until they meet.`,
  `Busca ${s} por su letra y su número. Sigue la columna y la fila hasta donde se cruzan.`,
  `试着用字母和数字找 ${s}，也就是那条纵线和横线相交的地方。`
 ],
 diagonal: [
  'Now look at c4. The white pawn can take the black pawn on b5 because it is one square forward and one square to the side.',
  'Ahora mira c4. El peón blanco puede tomar el de b5 porque está una casilla hacia delante y otra hacia un lado.',
  '再看 c4 的白兵。b5 在它的斜前方一格，所以白兵能吃掉那里的黑兵。'
 ],
 check: [
  'Your queen attacks the king. This is check. Black must make the king safe on this move, by moving it, blocking the attack, or taking the attacker.',
  'Tu dama ataca al rey. Es jaque. En esta jugada las negras deben poner a salvo al rey: moverlo, tapar el ataque o capturar a la pieza que lo da.',
  '白后正在攻击黑王，这叫将军。黑方这一步必须解将：移王、挡住攻击，或者吃掉将军的棋子。'
 ],
 mate: [
  'The king is in check and every way out is covered. That is checkmate. The game ends here, with both kings still on the board.',
  'El rey está en jaque y todas las salidas están cubiertas. Eso es jaque mate. La partida termina aquí, con los dos reyes todavía en el tablero.',
  '黑王正在被将军，所有解将的办法都行不通，这就是将杀。棋局到此结束，两个王都留在棋盘上。'
 ],
 stalemate: [
  'The king is not in check and the side to move has no legal move. That is stalemate, a draw. Before giving up the king’s last escape square, check whether your move also gives check.',
  'El rey no está en jaque y el bando al que le toca mover no tiene ninguna jugada legal. Es ahogado y son tablas. Antes de quitarle su última salida al rey, comprueba si tu jugada también da jaque.',
  '轮到走棋的一方没有被将军，却一步合法棋也走不了。这叫逼和，结果是和棋。封住王最后一个逃生格前，先看看你这一步是否也在将军。'
 ],
 caught: [
  'You reached the pawn before it could promote. With only the kings left, neither player can checkmate.',
  'Alcanzaste el peón antes de que coronara. Con solo los reyes en el tablero, nadie puede dar mate.',
  '你在黑兵升变前追上了它。只剩两个王时，双方都无法将杀。'
 ],
 bishop: [
  'You removed both pawns. Your bishop can guard one color, but a single bishop and king cannot force or even give mate against a lone king.',
  'Quitaste los dos peones. Tu alfil vigila un color, pero con un solo alfil y tu rey es imposible dar mate a un rey solitario.',
  '两个黑兵都没了。象能守住一种颜色的格子，但单象和王无法将杀单王。'
 ],
 knight: [
  'Both pawns are gone. A knight attacks several separated squares, but with just your king to help, it cannot checkmate the lone king.',
  'Ya no quedan peones. El caballo ataca varias casillas separadas, pero con la única ayuda de tu rey no puede dar mate a un rey solitario.',
  '两个兵都被吃掉了。马能攻击好几个彼此分开的格子，但只有王帮忙时，单马无法将杀单王。'
 ]
};
