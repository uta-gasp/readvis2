git checkout -b gh-pages
call grunt publish
git add --all
git commit -m "update"
git push origin gh-pages --force
git checkout master
git branch -D gh-pages
