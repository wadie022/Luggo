from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('coreapp', '0014_conversation_message'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='msg_type',
            field=models.CharField(
                choices=[('text', 'Texte'), ('image', 'Image'), ('audio', 'Audio'), ('document', 'Document')],
                default='text',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='message',
            name='file',
            field=models.FileField(blank=True, null=True, upload_to='messages/'),
        ),
        migrations.AlterField(
            model_name='message',
            name='content',
            field=models.TextField(blank=True, default=''),
        ),
    ]
