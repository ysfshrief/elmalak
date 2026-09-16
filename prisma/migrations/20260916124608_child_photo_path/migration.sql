-- إعادة تسمية لا حذف وإنشاء: القيمة تتغيّر دلالتها (معرّف ملف ← مسار)،
-- لكن العمود هو نفسه، فلا داعي لإسقاط ما فيه.
ALTER TABLE "Child" RENAME COLUMN "photoFileId" TO "photoPath";
