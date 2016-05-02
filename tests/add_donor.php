<?php
if( $_POST['text']) {
  echo "POST REQUEST";
  $file = fopen("score.txt","w");
  fwrite($file,$_POST['text']);
exit();
}
?>
