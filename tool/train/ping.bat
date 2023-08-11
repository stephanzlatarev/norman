echo off

echo Trainer 0
call k norman log trainer-0 trainer --tail=8
echo Trainer 1
call k norman log trainer-1 trainer --tail=8
echo Trainer 2
call k norman log trainer-2 trainer --tail=8
