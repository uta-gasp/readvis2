git checkout -b gh-pages
copy pub\* /Y
call grunt
git add --all
git commit -m "update"
git push origin gh-pages --force
git checkout master
git branch -D gh-pages
