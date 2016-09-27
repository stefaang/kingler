"""empty message

Revision ID: 66c2b439ab31
Revises: d10bd7644d06
Create Date: 2016-09-27 17:28:28.350441

"""

# revision identifiers, used by Alembic.
revision = '66c2b439ab31'
down_revision = 'd10bd7644d06'

from alembic import op
import sqlalchemy as sa
import geoalchemy2


def upgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.create_table('position',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=True),
    sa.Column('pos', geoalchemy2.types.Geometry(geometry_type='POINT'), nullable=True),
    sa.Column('accuracy', sa.Integer(), nullable=True),
    sa.Column('time', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    ### end Alembic commands ###


def downgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('position')
    ### end Alembic commands ###
